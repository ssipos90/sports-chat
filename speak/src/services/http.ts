import { json } from 'body-parser';
import express, { ErrorRequestHandler, Express, Router } from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import { env, Env } from '../config';
import { HttpError } from 'http-errors';
import { Response } from 'express-serve-static-core';

function formatError (error: Error, _response: Response): [number, string] {
  if (error === undefined) {
    return [404, 'The void.'];
  }

  if (error instanceof HttpError) {
    return [error.statusCode, error.message];
  }

  return [500, 'Internal server error.'];
}

const finalHandler: ErrorRequestHandler = function (error, _request, response, next) {
  if (response.headersSent) {
    return next(error);
  }

  console.error('final handler error', error);

  const [statusCode, errorMessage] = formatError(error, response);

  response.status(statusCode);

  const payload: { error: string, details: string | undefined } = {
    error: errorMessage,
    details: env === Env.Production ? undefined : error.toString(),
  };

  response.format({
    'application/json': () => {
      response.json(payload);
    },
    default: () => {
      response.type('text/plain')
        .send(Object
          .values(payload.error)
          .filter(v => v !== undefined)
          .join('\n\n'),
        );
    },
  })
    .end();

  next();
};

export function startExpress (routes: Router): Express {
  const app = express()
    .use(helmet())
    .use(morgan('dev'))
    .use(json({ strict: true }))
    .use(routes)
    .use(finalHandler);

  return app;
}
