// import { request } from 'http';
import { registerUser } from 'src/services/users';
import { createRoom } from 'src/services/rooms';
import WebSocket from 'ws';
import * as config from 'src/config';
import { delay, uuid } from 'src/lib/misc';
import { promisify } from 'util';
import { createServer } from 'http';
import { wsEventHandlers } from 'src/wsEventHandlers';
import { createWsServer, WsOutgoingMessage } from 'src/services/ws';
import { createDefer, sendMsg } from 'src/lib/test';
import { expect } from 'chai';
import { isValid, parseISO } from 'date-fns';

const smolDelay = delay(50);

describe('chatting', function () {
  const defer = createDefer();
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

    const room = await createRoom({
      matchId: uuid(),
    });

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

    await sendMsg(client1, {
      event: 'joinRoom',
      payload: {
        roomId: room._id,
      },
    });

    await sendMsg(client2, {
      event: 'joinRoom',
      payload: {
        roomId: room._id,
      },
    });

    function whateverMan (msg: WebSocket.RawData): Buffer[] {
      if (msg instanceof ArrayBuffer) {
        return [Buffer.from(msg)];
      }
      return Array.isArray(msg) ? msg : [msg];
    }

    const [recievedMessage1, recievedMessage2, sentMessage] =
      await Promise.all([
        new Promise<WsOutgoingMessage<unknown>>(resolve => {
          client1.on('message', msg => {
            const msg1 = whateverMan(msg)
              .map(msg => JSON.parse(msg.toString()))
              .find(msg => {
                return msg.event === 'messageReceived';
              });
            if (msg1) {
              resolve(msg1);
            }
          });
        }),
        new Promise<WsOutgoingMessage<unknown>>(resolve => {
          client2.on('message', msg => {
            const msg1 = whateverMan(msg)
              .map(msg => JSON.parse(msg.toString()))
              .find(msg => {
                return msg.event === 'messageReceived';
              });
            if (msg1) {
              resolve(msg1);
            }
          });
        }),
        smolDelay()
          .then(async () =>
            await sendMsg(client2, {
              event: 'sendMessage',
              payload: {
                _id: uuid(),
                roomId: room._id,
                userId: user2._id,
                body: 'message2',
              },
            })),
      ]);

    // TODO: create a tool for asserting as WsMessage
    expect(recievedMessage1).to.have.property('_id').that.is.a('string');
    expect(recievedMessage1).to.have.property('event').that.equals('messageReceived');
    expect(recievedMessage1).to.have.property('ts').that.is.a('string');
    expect(recievedMessage1).to.have.property('payload'); // TODO: this should be skippable
    const ts = parseISO(recievedMessage1.ts);
    expect(ts).to.be.instanceOf(Date);
    expect(isValid(ts)).to.equal(true);

    expect(recievedMessage1.payload).to.include.keys(['_id', 'ts']);
    expect(recievedMessage1.payload).to.have.property('roomId', sentMessage.payload.roomId);
    expect(recievedMessage1.payload).to.have.property('body', sentMessage.payload.body);
    expect(recievedMessage1.payload).to.have.property('userId', user2._id);

    expect(recievedMessage1.payload).to.deep.equal(recievedMessage2.payload);
  });
});
