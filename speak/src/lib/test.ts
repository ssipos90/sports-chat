import { promisify } from 'util';
import { wsMsg, WsMsg, WsOutgoingMessage } from 'src/services/ws';
import WebSocket from 'ws';

export async function sendMsg<P> (client: WebSocket, data: WsMsg<P>): Promise<WsOutgoingMessage<P>> {
  const message = wsMsg(data);
  await promisify(client.send).call(client, JSON.stringify(message));

  return message;
}

export function createDefer (): ((cb: () => Promise<void> | void) => void) {
  const deferredItems: Array<() => Promise<void> | void> = [];

  afterEach(async () => {
    for (const d of deferredItems) {
      await d();
    }
    deferredItems.length = 0;
  });

  return cb => deferredItems.push(cb);
}
