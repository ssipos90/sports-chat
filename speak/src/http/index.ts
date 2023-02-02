import { Router } from 'express';
import { routes as chat } from './chat';
import { routes as users } from './users';

export const routes: Router = Router()
  .use('/api', Router()
    .use('/chat', chat)
    .use('/users', users),
  );
