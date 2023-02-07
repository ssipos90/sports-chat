import Debug from 'debug';
import { IncomingMessage, Server } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { userFromAuthorizationBearer } from '../middleware';
import { User } from './users';
import { v4 as uuid } from 'uuid';
import { z, ZodError } from 'zod';
import { isValid, parseISO } from 'date-fns';
import { redis } from 'src/redis';
import { idValidator } from 'src/lib/misc';
import { loadRoom } from './rooms';
import { redisXListen } from 'src/lib/redis';

// interface Match {
//   _id: ID
//   title: string
//   startDate: Date
//   users: User[]
// }

export interface ClientRoom {
  _id: ID
  // match: Match
  clients: Set<Client>
}

interface Message {
  _id: string
  roomId: ID
  userId: ID
  body: string
  ts: Date
}

interface Client {
  _id: ID
  user: User
  rooms: Set<ID>
  ws: WebSocket
}

interface Context {
  joinRoom: (client: Client, roomId: ID) => Promise<ClientRoom>
  sendMessage: (message: Message) => Promise<Message>
}

export interface WsMessage<P = undefined> {
  _id: string
  userId: string
  event: string
  ts: Date
  payload?: P
}

export interface WsOutgoingMessage<P = undefined> {
  _id: string
  event: string
  ts: string
  payload?: P
}

export const baseMessageValidator = z.object({
  _id: idValidator,
  userId: idValidator,
  ts: z.string()
    .transform(s => parseISO(s))
    .refine(isValid),
});

export type WsEventHandler = (client: Client, wsMessage: WsMessage<unknown>, context: Context) => Promise<void>;

export type WsEventHandlers = Record<string, WsEventHandler>;

export async function createWsServer (server: Server, handlers: WsEventHandlers): Promise<WebSocketServer> {
  const wss = new WebSocketServer({
    noServer: true,
  });

  const clients: Client[] = [];
  const clientRooms: Map<ID, ClientRoom> = new Map();

  function listenToRoom (room: ClientRoom): void {
    console.log('listening to room: ', room._id);
    redisXListen(redis, {
      onError (error) {
        console.error(error);

        return true;
      },
      onMessage (stream, message) {
        console.log(`got message in room ${room._id}`, message);
        const relevantClients = clients
          .filter(client => client.rooms.has(room._id));

        // remove this listener since nobody wants it
        if (relevantClients.length === 0) {
          return false;
        }

        // directly send the message without decode/encode
        relevantClients.forEach(client => {
          client.ws.send(message);
        });

        return true;
      },
      onStop (reason, error) {
        switch (reason) {
          case 'error':
            console.log('stopped listenting to stream because of error: ', error);
            break;
          case 'stop':
            console.log('stopped listening to stream.');
            break;
        }
        clients
          .forEach(client => {
            client.rooms.delete(room._id);
            // TODO: send client room disconnect message
          });
      },
      stream: `messages:${room._id}`,
    });
  }

  server.on('upgrade', (request, socket, head) => {
    userFromAuthorizationBearer(request)
      .then(user => {
        if (user == null) {
          throw new Error('No user.');
        }
        wss.handleUpgrade(request, socket, head, ws => {
          const client = createClient(user, ws);
          clients.push(client);
          wss.emit('connection', ws, request, client);
        });
      })
      .catch(e => {
        console.log('Failed to authenticate websocket: ', e);
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
      });
  });

  function createClient (user: User, ws: WebSocket): Client {
    const client: Client = {
      _id: uuid(),
      user,
      rooms: new Set(),
      ws,
    };

    return client;
  }

  function buildClientRoom (roomId: ID): ClientRoom {
    console.log('building client room.');

    const clientRoom: ClientRoom = {
      _id: roomId,
      clients: new Set(),
    };
    clientRooms.set(roomId, clientRoom);

    loadRoom(roomId)
      .then(room => {
        if (room === null) {
          return Promise.reject(new Error('This isn\'t the room you\'re looking for.'));
        }

        // TODO: update clientRoom with db data

        listenToRoom(clientRoom);
      })
      .catch(e => {
        console.error('Failed to load room', e);
        disconnectClientRoom(clientRoom, e.message);
      });

    return clientRoom;
  }

  function disconnectClientRoom (clientRoom: ClientRoom, error?: string): void {
    clientRooms.delete(clientRoom._id);
    const message: WsOutgoingMessage<{ roomId: ID, error?: string }> = {
      _id: '',
      event: 'roomDisconnected',
      ts: new Date().toISOString(),
      payload: {
        roomId: clientRoom._id,
        error,
      },
    };
    clientRoom.clients.forEach(client => {
      client.rooms.delete(clientRoom._id);
      client.ws.send(JSON.stringify({ ...message, _id: uuid() }));
    });
  }

  const context: Context = {
    async joinRoom (client, roomId) {
      const clientRoom = clientRooms.get(roomId) ?? buildClientRoom(roomId);

      client.rooms.add(roomId);
      clientRoom.clients.add(client);

      return clientRoom;
    },
    async sendMessage (message) {
      await redis.xadd(`messages:${message.roomId}`, '*', 'message', JSON.stringify(message));

      return message;
    },
  };

  const messageValidator = z.object({
    _id: idValidator,
    event: z.string().refine(event => event in handlers, 'Unknown event type'),
    userId: idValidator,
    ts: z.string()
      .transform(s => parseISO(s))
      .refine(isValid),
    payload: z.any(),
  });

  wss.on('connection', function onConnection (ws: WebSocket, _request: IncomingMessage, client: Client) {
    const debug = Debug(`connection:${client._id}`);
    debug('Connection established.');

    ws.on('message', function onMessage (data) {
      debug('Received message(s)');
      if (data instanceof ArrayBuffer) {
        // TODO: handle unsupported case
        return;
      }
      (Array.isArray(data) ? data : [data])
        .forEach(buf => {
          let data;
          try {
            data = JSON.parse(buf.toString());
          } catch (e) {
            debug('Failed to parse wsMessage: %j', e);
            // TODO: handle parse error
            return;
          }
          let wsMessage: z.infer<typeof messageValidator>;
          try {
            wsMessage = messageValidator.parse(data);
          } catch (e) {
            debug('Failed to validate wsMessage: %j', e);
            if (e instanceof ZodError) {
              // TODO: maybe count to 3 and disconnect
              ws.send(JSON.stringify({
                error: 'Websocket message validation error',
                errors: e.flatten().fieldErrors,
              }));
            }
            return;
          }
          debug('Message: %j', wsMessage);
          const handler = handlers[wsMessage.event];
          if (handler === undefined) {
            // TODO: stop
            console.warn('undefined handler for type');
          } else {
            handler(client, wsMessage, context)
              .catch(e => console.log(e));
          }
        });
    });

    ws.on('close', function onClose (code, reason) {
      debug(`Closed with code ${code} and with reason of buffer length: ${reason.length}.`);
      const idx = clients.indexOf(client);
      if (idx > -1) {
        clients.splice(idx, 1);
      }
    });
  });

  return wss;
}
