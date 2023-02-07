// import { request } from 'http';
import { registerUser } from 'src/services/users';
import { createRoom } from 'src/services/rooms';
import WebSocket from 'ws';
import * as config from 'src/config';
import { uuid } from 'src/lib/misc';
import { promisify } from 'util';
import { createServer } from 'http';
import { wsEventHandlers } from 'src/wsEventHandlers';
import { createWsServer } from 'src/services/ws';

const deferredItems: Array<() => Promise<void> | void> = [];

afterEach(async () => {
  console.log('running deferred items.');
  for (const d of deferredItems) {
    await d();
  }
  deferredItems.length = 0;
});

export function defer (callback: () => Promise<void> | void): void {
  deferredItems.push(callback);
}

describe('chatting', function () {
  before('start http server', async function () {
    this.httpServer = createServer();
    this.wss = await createWsServer(this.httpServer, wsEventHandlers);

    await new Promise<void>(resolve => this.httpServer.listen(8000, () => {
      resolve();
    }));
  });

  after('stop http server', async function () {
    await new Promise<void>(resolve => {
      this.httpServer.closeAllConnections();
      this.httpServer.close(resolve);
    });
  });

  it('blabbering on', async function () {
    const user1 = await registerUser({
      username: 'sebi',
      password: '1q2w3e',
    });
    const user2 = await registerUser({
      username: 'swebi',
      password: '1q2w3e',
    });

    const room = await createRoom();

    const client1 = new WebSocket(`ws://localhost:${config.http.port}/`, {
      headers: {
        Authorization: user1._id,
      },
    });
    const client2 = new WebSocket(`ws://localhost:${config.http.port}/`, {
      headers: {
        Authorization: user2._id,
      },
    });

    defer(() => {
      client1.close();
      client2.close();
    });

    await promisify(client1.on).call(client1, 'open');
    await promisify(client2.on).call(client2, 'open');

    await promisify(client1.send).call(client1, JSON.stringify({
      _id: uuid(),
      userId: user1._id,
      event: 'joinRoom',
      ts: new Date().toISOString(),
      payload: {
        roomId: room._id,
      },
    }));
    await promisify(client2.send).call(client2, JSON.stringify({
      _id: uuid(),
      userId: user2._id,
      event: 'joinRoom',
      ts: new Date().toISOString(),
      payload: {
        roomId: room._id,
      },
    }));

    await new Promise<void>(resolve => {
      client2.on('message', msg => {
        console.log('message received', (msg as Buffer).toString('utf8'));
        resolve();
      });
      client1.send(JSON.stringify({
        _id: uuid(),
        userId: user2._id,
        event: 'sendMessage',
        ts: new Date().toISOString(),
        payload: {
          _id: uuid(),
          roomId: room._id,
          userId: user2._id,
          body: 'smf',
          ts: new Date().toISOString(),
        },
      }));
    });
  });
});
