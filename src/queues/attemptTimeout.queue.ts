import { Queue } from 'bullmq';
import { env } from '../config/env.js';

const redisUrl = new URL(env.REDIS_URL);
const connection = { host: redisUrl.hostname, port: Number(redisUrl.port || 6379) };

export const attemptTimeoutQueue = new Queue('attempt-timeout', { connection });

export function scheduleAttemptTimeout(attemptId: number, delayMs: number) {
  return attemptTimeoutQueue.add(
    'expire',
    { attemptId },
    { jobId: `attempt-${attemptId}`, delay: delayMs, removeOnComplete: true, removeOnFail: true },
  );
}

export function cancelAttemptTimeout(attemptId: number) {
  return attemptTimeoutQueue.remove(`attempt-${attemptId}`);
}
