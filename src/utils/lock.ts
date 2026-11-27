import Redis from 'ioredis';
import { env } from '../config/env.js';

const redis = new Redis(env.REDIS_URL);

export async function withLock<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const token = Math.random().toString(36).slice(2);
  const acquired = await redis.set(key, token, 'PX', ttlMs, 'NX');
  if (!acquired) {
    throw new Error('LOCK_BUSY');
  }
  try {
    return await fn();
  } finally {
    const script = `if redis.call("GET", KEYS[1]) == ARGV[1] then return redis.call("DEL", KEYS[1]) else return 0 end`;
    await redis.eval(script, 1, key, token);
  }
}
