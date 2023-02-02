import Redis from 'ioredis';
import { startRedis } from './services/redis';

export const redis: Redis = startRedis();
