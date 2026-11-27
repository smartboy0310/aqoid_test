import { Queue } from 'bullmq';
import { env } from '../config/env.js';

const redisUrl = new URL(env.REDIS_URL);
const connection = { host: redisUrl.hostname, port: Number(redisUrl.port || 6379) };

export const broadcastQueue = new Queue('broadcast', { connection });

export function enqueueBroadcast(
  target: 'ALL' | 'STUDENT' | 'TEACHER',
  text: string,
  requestedByTelegramId: number,
) {
  return broadcastQueue.add('send', { target, text, requestedByTelegramId });
}
