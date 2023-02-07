import { envStrict, envStrictAs, envStrictAsInt } from './lib/runtime';
// import type { MongoClientOptions } from 'mongodb';

export enum Env {
  Production = 'production',
  Development = 'development',
  Test = 'test',
}

export const env = envStrictAs('NODE_ENV', env => {
  switch (env) {
    case 'production':
      return Env.Production;
    case 'test':
      return Env.Test;
    case 'development':
      return Env.Development;
    default:
      throw new Error(`Unknown environment "${env}".`);
  }
});

export const http = {
  interface: '0.0.0.0',
  hostname: envStrict('SPEAK_HOSTNAME'),
  port: envStrictAsInt('SPEAK_PORT'),
} as const;

export const redis = {
  uri: envStrict('REDIS_URI'),
};

// const mongoDbOptions: MongoClientOptions = {
//   retryWrites: true,
//   w: 'majority',
// };
// export const mongodb = {
//   uri: envStrict('MONGODB_URI'),
//   options: mongoDbOptions,
// };
