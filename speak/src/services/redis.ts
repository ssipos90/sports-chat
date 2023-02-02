import { Redis } from 'ioredis';
import { redis as config } from '../config';

export function startRedis (): Redis {
  const redis = new Redis(config.uri);
  // do stuff

  return redis;
};
