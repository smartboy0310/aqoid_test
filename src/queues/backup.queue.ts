import { Queue } from 'bullmq';
import { env } from '../config/env.js';

const redisUrl = new URL(env.REDIS_URL);
const connection = { host: redisUrl.hostname, port: Number(redisUrl.port || 6379) };

export const backupQueue = new Queue('backup', { connection });

export function enqueueBackup(requestedByTelegramId: number) {
  return backupQueue.add('create', { requestedByTelegramId });
}
