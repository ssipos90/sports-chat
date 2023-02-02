import Debug from 'debug';
import { IncomingMessage, Server } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { userFromAuthorizationBearer } from '../middleware';
import { User } from './users';
import { v4 as uuid } from 'uuid';
import { z, ZodError } from 'zod';
import { isValid, parseISO } from 'date-fns';
import { redis } from '../redis';

async function loadRoom (roomId: ID): Promise<Room | null> {
  // TODO: load room from redis
  return null;
}

interface Match {
  _id: ID
  title: string
  startDate: Date
  users: User[]
}

interface Room {
  _id: ID
  match: Match
  clients: Client[]
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
  chats: ID[]
  ws: WebSocket
}

interface Context {
  joinRoom: (client: Client, roomId: ID) => Promise<Room>
  sendMessage: (message: Message) => Promise<Message>
}

export interface WsMessage<P = undefined> {
  _id: string
  userId: string
  event: string
  ts: Date
  payload?: P
}

export const baseMessageValidator = z.object({
  _id: z.string().length(32),
  userId: z.string().length(32),
  ts: z.string()
    .transform(s => parseISO(s))
    .refine(isValid),
});

export type WsEventHandler = (client: Client, wsMessage: WsMessage<unknown>, context: Context) => Promise<void>;

export type WsEventHandlers = Record<string, WsEventHandler>;

export async function createWsServer (server: Server, handlers: WsEventHandlers): Promise<WebSocketServer> {
  const wss = new WebSocketServer({
    server,
  });

  function createClient (user: User, ws: WebSocket): Client {
    const client: Client = {
      _id: uuid(),
      user,
      chats: [],
      ws,
    };

    return client;
  }

  const context: Context = {
    async joinRoom (client: Client, roomId: ID) {
      // this function mutates and it's kind of sucky

      const loadedRoom = rooms.find(room => room._id === roomId);
      const room = loadedRoom ?? await loadRoom(roomId);

      if (room === null) {
        throw new Error('This isn\'t the room you\'re looking for.');
      }

      if (loadedRoom === undefined) {
        // await redis.hset(`rooms:${payload.roomId}`, 'room', JSON.stringify(room));
        // for (; ;) {
        //   const response = await redis.xread('BLOCK', 0, 'STREAMS', `messages:${payload.roomId}`);
        // }
        rooms.push(room);
      }

      room.clients.push(client);

      return room;
    },
    async sendMessage (message) {
      // TODO: push this to redis :)
      return message;
    },
  };

  const clients: Client[] = [];
  const rooms: Room[] = [];

  const messageValidator = z.object({
    _id: z.string().length(32),
    event: z.string().refine(event => event in handlers, 'Unknown event type'),
    userId: z.string().length(32),
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
              // TODO: handle validation errors
              ws.send(JSON.stringify({
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

  return wss;
}
