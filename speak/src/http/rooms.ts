import { Router } from 'express';
import { Room } from '../services/rooms';
import { uuid } from '../lib/misc';
import { redis } from '../redis';

export const routes = Router()
  .post('/', (req, res, next) => {
    const room: Room = {
      _id: uuid(),
    };

    redis.hset(`rooms:${room._id}`, 'room', JSON.stringify(room))
      .then(() => {
        res.json({
          data: { room },
        });
      })
      .catch(e => next(e));
  });
