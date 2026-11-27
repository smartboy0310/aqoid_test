import { Queue } from 'bullmq';
import { env } from '../config/env.js';

const redisUrl = new URL(env.REDIS_URL);
const connection = { host: redisUrl.hostname, port: Number(redisUrl.port || 6379) };

export const reportQueue = new Queue('reports', { connection });

export function enqueueReport(testId: number, requestedByTelegramId: number) {
  return reportQueue.add('generate-report', { testId, requestedByTelegramId });
}
