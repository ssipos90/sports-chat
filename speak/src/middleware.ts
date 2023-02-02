import { RequestHandler } from 'express-serve-static-core';
import { getUser, User } from './services/users';
import { Unauthorized, BadRequest } from 'http-errors';
import { IncomingMessage } from 'http';

export const auth: RequestHandler = function (req, _res, next) {
  userFromAuthorizationBearer(req)
    .then(user => {
      if (user === null) {
        throw new Unauthorized('Unknown user.');
      }
      req.user = user;
      next();
    })
    .catch(e => next(e));
};

export async function userFromAuthorizationBearer (req: IncomingMessage): Promise<User | null> {
  if (!('authorization' in req.headers) || req.headers.authorization === undefined) {
    throw new BadRequest('Authorization header missing');
  }

  return await getUser(req.headers.authorization);
}
