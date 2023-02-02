import { createServer, Server } from 'http';
import { Express } from 'express';
import { WebSocketServer } from 'ws';
import { createWsServer } from './services/ws';
import { startExpress } from './services/http';
import { routes } from './http';
import { http } from './config';
import { wsEventHandlers } from './wsEventHandlers';

export const start = async function (): Promise<[Server, Express, WebSocketServer]> {
  process.on('uncaughtException', function (e) {
    console.error(e);
    process.exit(2);
  });
  const app = startExpress(routes);
  const server = createServer(app);

  const wss = await createWsServer(server, wsEventHandlers);

  server.listen(http.port, http.interface, () => {
    console.log(`Started listening on ${http.interface}:${http.port}`);
  });

  return [server, app, wss];
};
