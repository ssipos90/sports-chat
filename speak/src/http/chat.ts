import { Router } from 'express';
// import { NotFound } from 'http-errors';

export const routes = Router();
// .post('/', (req, res, next) => {
//   createChatValidator(req.body)
//     .then(createChat)
//     .then(chat => {
//       res.json(chat);
//     })
//     .catch(e => next(e));
// })
// .get('/:chatId', (req, res, next) => {
//   getChat(req.params.chatId)
//     .then(chat => {
//       if (chat === null) {
//         throw new NotFound();
//       }
//       res.json(chat);
//     })
//     .catch(e => next(e));
// });
