import { Router } from 'express';
import { createRoom } from 'src/services/rooms';

export const routes = Router()
  .post('/', (req, res, next) => {
    createRoom()
      .then(room => {
        res.json({
          data: { room },
        });
      })
      .catch(e => next(e));
  });
