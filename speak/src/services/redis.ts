import { Redis } from 'ioredis';
import { redis as config } from '../config';

export function startRedis (): Redis {
  const redis = new Redis(config.uri, {
    enableAutoPipelining: true,
  });
  // do stuff

  return redis;
};
