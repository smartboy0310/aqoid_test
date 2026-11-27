import { Worker } from 'bullmq';
import { Telegraf } from 'telegraf';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { userRepository } from '../repositories/user.repository.js';

const redisUrl = new URL(env.REDIS_URL);
const connection = { host: redisUrl.hostname, port: Number(redisUrl.port || 6379) };

const telegram = new Telegraf(env.BOT_TOKEN).telegram;
const DELAY_MS = 50;

export const broadcastWorker = new Worker(
  'broadcast',
  async (job) => {
    const { target, text, requestedByTelegramId } = job.data as {
      target: 'ALL' | 'STUDENT' | 'TEACHER';
      text: string;
      requestedByTelegramId: number;
    };

    const users = await userRepository.findForBroadcast(target);
    let sent = 0;
    let failed = 0;

    for (const u of users) {
      try {
        await telegram.sendMessage(u.telegramId.toString(), text);
        sent++;
      } catch (err) {
        failed++;
        logger.warn({ err, telegramId: u.telegramId.toString() }, "Broadcast xabarini yuborib bo'lmadi");
      }
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }

    await telegram.sendMessage(
      requestedByTelegramId.toString(),
      `📢 Xabar yuborildi.\n\nMuvaffaqiyatli: ${sent}\nXato: ${failed}`,
    );
  },
  { connection },
);

broadcastWorker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'broadcast job xato bilan tugadi'));
