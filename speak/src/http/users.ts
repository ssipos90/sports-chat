import { Router } from 'express';
import { registerUser } from '../services/users';

export const routes = Router()
  .post('/', (req, res, next) => {
    registerUser(req.body)
      .then(user => {
        res.json(user);
      })
      .catch(e => next(e));
  });
