import { session } from 'telegraf';
import type { SessionStore } from 'telegraf';
import Redis from 'ioredis';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import type { AppWizardSession } from '../../types/context.js';

const redis = new Redis(env.REDIS_URL);
redis.on('error', (err) => logger.error({ err }, 'Redis (session) xatoligi'));

const SESSION_TTL_SEC = 60 * 60 * 6; // 6 soat

const redisStore: SessionStore<AppWizardSession> = {
  async get(key) {
    const raw = await redis.get(`session:${key}`);
    return raw ? JSON.parse(raw) : undefined;
  },
  async set(key, value) {
    await redis.set(`session:${key}`, JSON.stringify(value), 'EX', SESSION_TTL_SEC);
  },
  async delete(key) {
    await redis.del(`session:${key}`);
  },
};

export const sessionMiddleware = session({ store: redisStore });
