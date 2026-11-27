import { Worker } from 'bullmq';
import { Telegraf } from 'telegraf';
import { stat } from 'node:fs/promises';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { backupService } from '../services/backup.service.js';

const redisUrl = new URL(env.REDIS_URL);
const connection = { host: redisUrl.hostname, port: Number(redisUrl.port || 6379) };

const telegram = new Telegraf(env.BOT_TOKEN).telegram;
const TELEGRAM_UPLOAD_LIMIT_BYTES = 50 * 1024 * 1024;

export const backupWorker = new Worker(
  'backup',
  async (job) => {
    const { requestedByTelegramId } = job.data as { requestedByTelegramId: number };

    try {
      const { filePath, fileName } = await backupService.createBackup();
      const { size } = await stat(filePath);

      if (size > TELEGRAM_UPLOAD_LIMIT_BYTES) {
        await telegram.sendMessage(
          requestedByTelegramId.toString(),
          `✅ Backup yaratildi, lekin fayl hajmi (${Math.round(size / 1024 / 1024)} MB) Telegram orqali yuborish uchun juda katta.\n\nServerdagi joylashuvi: ${filePath}`,
        );
        return;
      }

      await telegram.sendDocument(requestedByTelegramId.toString(), { source: filePath, filename: fileName });
    } catch (err) {
      logger.error({ err }, 'Backup yaratishda xatolik');
      await telegram.sendMessage(
        requestedByTelegramId.toString(),
        "❗ Backup yaratishda xatolik yuz berdi. Serverda `pg_dump` o'rnatilganini va DATABASE_URL to'g'riligini tekshiring.",
      );
    }
  },
  { connection },
);

backupWorker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'backup job xato bilan tugadi'));
