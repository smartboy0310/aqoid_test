import { Worker } from 'bullmq';
import { Telegraf } from 'telegraf';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { attemptService } from '../services/attempt.service.js';

const redisUrl = new URL(env.REDIS_URL);
const connection = { host: redisUrl.hostname, port: Number(redisUrl.port || 6379) };

// faqat sendMessage uchun — getUpdates chaqirmaydi, shuning uchun
// asosiy bot (long polling) bilan ziddiyat yo'q
const telegram = new Telegraf(env.BOT_TOKEN).telegram;

export const attemptTimeoutWorker = new Worker(
  'attempt-timeout',
  async (job) => {
    const { attemptId } = job.data as { attemptId: number };
    const result = await attemptService.finishExpiredAttempt(attemptId);
    if (!result) return;

    await telegram.sendMessage(result.telegramId.toString(), `⏰ Vaqtingiz tugadi!\n\n${result.message}`);
  },
  { connection },
);

attemptTimeoutWorker.on('failed', (job, err) =>
  logger.error({ jobId: job?.id, err }, 'attempt-timeout job xato bilan tugadi'),
);
