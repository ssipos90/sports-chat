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
import { loadRoom, Room } from './rooms';
import { redisXListen } from 'src/lib/redis';
import { Duplex } from 'stream';

// interface Match {
//   _id: ID
//   title: string
//   startDate: Date
//   users: User[]
// }

export interface ClientRoom {
  _id: ID
  room?: Room
  clients: Set<Client>
}

interface Message {
  _id: string
  roomId: ID
  userId: ID
  body: string
  ts: Date
}

export interface WsMsg<P> extends Pick<WsOutgoingMessage<P>, 'payload' | 'event'> {
  _id?: ID
  ts?: string
};

interface Client {
  _id: ID
  user: User
  rooms: Set<ID>
  sendJson: <P>(wsMsg: WsMsg<P>, cb?: (err?: Error) => void) => WsOutgoingMessage<P>
  ws: WebSocket
}

interface Context {
  joinRoom: (client: Client, roomId: ID) => Promise<void>
  sendMessage: (message: Omit<Message, 'ts'>) => Promise<void>
}

export interface WsMessage<P = undefined> {
  _id: string
  event: string
  ts: Date
  payload?: P
}

export interface WsOutgoingMessage<P = undefined> {
  _id: string
  event: string
  ts: string
  payload: P
}

export type WsEventHandler = (client: Client, wsMessage: WsMessage<unknown>, context: Context) => Promise<void>;

export type WsEventHandlers = Record<string, WsEventHandler>;

interface WsServerHandler {
  handleUpgrade: (request: IncomingMessage, socket: Duplex, head: Buffer) => void
}

export function wsMsg <P> (data: WsMsg<P>): WsOutgoingMessage<P> {
  return {
    _id: data._id ?? uuid(),
    ts: data.ts ?? new Date().toISOString(),
    ...data,
  };
}

export function handleWsServer (wss: WebSocketServer, handlers: WsEventHandlers): WsServerHandler {
  const clients: Client[] = [];
  const clientRooms: Map<ID, ClientRoom> = new Map();
  const debug = Debug('ws-server');

  function listenToRoom (room: ClientRoom): void {
    debug('listening to room %s', room._id);
    redisXListen(redis, {
      onError (error) {
        debug('redisXListen error: %O', error);

        return true;
      },
      onMessage (_, key, message) {
        // TODO: take a look at key, it should only be a message :)
        switch (key) {
          case 'message': {
            debug('got message in room %s. %O', room._id, message);
            const relevantClients = clients
              .filter(client => client.rooms.has(room._id));

            // remove this listener since nobody wants it
            if (relevantClients.length === 0) {
              return false;
            }

            // TODO: try directly sending the message without decode/encode
            const payload = JSON.parse(message);

            relevantClients.forEach(client => {
              client.sendJson({
                event: 'messageReceived',
                payload,
              });
            });

            return true;
          };
          default:
            return true;
        }
      },
      onStop (reason, error) {
        switch (reason) {
          case 'error':
            debug('stopped listenting to stream because of error: %O', error);
            break;
          case 'stop':
            debug('stopped listening to stream.');
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

  function createClient (user: User, ws: WebSocket): Client {
    const client: Client = {
      _id: uuid(),
      user,
      rooms: new Set(),
      sendJson (message, cb) {
        const m = wsMsg(message);
        client.ws.send(JSON.stringify(m), cb);

        return m;
      },
      ws,
    };

    return client;
  }

  function retrieveClientRoom (roomId: ID): ClientRoom {
    const lDebug = debug.extend(`retrieve-client-room:${roomId}`, ':');
    lDebug('retrieving client room %s', roomId);

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

        clientRoom.room = room;

        lDebug('successfully loaded the room');

        listenToRoom(clientRoom);
        clientRoom.clients.forEach(client => {
          client.sendJson({
            event: 'roomLoaded',
            payload: { room },
          });
        });
      })
      .catch(e => {
        lDebug('Failed to load room: %O', e);
        disconnectClientRoom(clientRoom, e.message);
      });

    return clientRoom;
  }

  function disconnectClientRoom (clientRoom: ClientRoom, error?: string): void {
    clientRooms.delete(clientRoom._id);
    const message: WsMsg<{ roomId: ID, error?: string }> = {
      event: 'roomDisconnected',
      ts: new Date().toISOString(),
      payload: {
        roomId: clientRoom._id,
        error,
      },
    };
    clientRoom.clients.forEach(client => {
      client.rooms.delete(clientRoom._id);
      client.sendJson(message);
    });
  }

  const context: Context = {
    async joinRoom (client, roomId) {
      debug('Client %s wants to join room %s', client._id, roomId);
      const clientRoom = clientRooms.get(roomId) ?? retrieveClientRoom(roomId);

      client.rooms.add(roomId);
      clientRoom.clients.add(client);

      client.sendJson({
        event: 'roomJoined',
        payload: {
          roomId,
        },
      });
    },
    async sendMessage (message) {
      debug('Sending message to room %s', message.roomId);
      await redis.xadd(`messages:${message.roomId}`, '*', 'message', JSON.stringify({
        ...message,
        ts: new Date().toISOString(),
      }));
    },
  };

  const messageValidator = z.object({
    _id: idValidator,
    event: z.string().refine(event => event in handlers, 'Unknown event type'),
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
              client.sendJson({
                event: 'validationFailed',
                payload: {
                  error: 'Websocket message validation error',
                  errors: e.flatten().fieldErrors,
                },
              });
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
              .catch(e => debug(e));
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

  return {
    handleUpgrade (request, socket, head) {
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
          debug(e);
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
        });
    },
  };
}

export async function createWsServer (server: Server, handlers: WsEventHandlers): Promise<WebSocketServer> {
  const wss = new WebSocketServer({
    noServer: true,
  });

  const { handleUpgrade } = handleWsServer(wss, handlers);

  server.on('upgrade', (request, socket, head) => {
    handleUpgrade(request, socket, head);
  });

  return wss;
}
