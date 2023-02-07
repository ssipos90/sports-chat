import { createServer, Server } from 'http';
import { Express } from 'express';
import { WebSocketServer } from 'ws';
import { createWsServer } from './services/ws';
import { startExpress } from './services/http';
import { routes } from './http';
import { http } from './config';
import { wsEventHandlers } from './wsEventHandlers';

export type App = [Server, Express, WebSocketServer];

export const start = async function (): Promise<App> {
  const app = startExpress(routes);
  const server = createServer(app);

  const wss = await createWsServer(server, wsEventHandlers);

  await new Promise<void>(resolve => server.listen(http.port, http.interface, () => {
    resolve();
  }));

  return [server, app, wss];
};
