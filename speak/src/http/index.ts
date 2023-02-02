import { Router } from 'express';
import { routes as users } from './users';
import { routes as rooms } from './rooms';

export const routes: Router = Router()
  .use('/api', Router()
    .use('/rooms', rooms)
    .use('/users', users),
  );
