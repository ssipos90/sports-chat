import { Router } from 'express';
import { idValidator } from 'src/lib/misc';
import { createRoom, listRooms } from 'src/services/rooms';
import { z } from 'zod';

const createRoomValidator = z.object({
  matchId: idValidator,
});

export const routes = Router()
  .post('/', (req, res, next) => {
    createRoomValidator
      .parseAsync(req.body)
      .then(createRoom)
      .then(room => {
        res.json({
          data: { room },
        });
      })
      .catch(e => next(e));
  })
  .get('/', (req, res, next) => {
    listRooms()
      .then(rooms => {
        res.json({ rooms });
      })
      .catch(e => next(e));
  });
