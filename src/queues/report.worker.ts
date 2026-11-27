import { Worker } from 'bullmq';
import { Telegraf } from 'telegraf';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { reportService } from '../services/report.service.js';
import { chartService } from '../services/chart.service.js';
import { analyticsService } from '../services/analytics.service.js';
import { prisma } from '../db/prisma.js';
import { t } from '../i18n/uz.js';

const redisUrl = new URL(env.REDIS_URL);
const connection = { host: redisUrl.hostname, port: Number(redisUrl.port || 6379) };

const telegram = new Telegraf(env.BOT_TOKEN).telegram;

export const reportWorker = new Worker(
  'reports',
  async (job) => {
    const { testId, requestedByTelegramId } = job.data as { testId: number; requestedByTelegramId: number };

    const test = await prisma.test.findUniqueOrThrow({ where: { id: testId } });
    const attempts = await prisma.attempt.findMany({
      where: { testId, status: { in: ['COMPLETED', 'EXPIRED'] } },
      select: { score: true },
    });

    if (attempts.length === 0) {
      await telegram.sendMessage(requestedByTelegramId.toString(), t.results.reportNoAttempts(test.title));
      return;
    }

    const xlsxBuffer = await reportService.buildTestReport(testId);
    const itemAnalysis = await analyticsService.getTestItemAnalysis(testId);
    const scoreChart = await chartService.scoreDistributionChart(attempts.map((a) => a.score ?? 0));
    const difficultyChart = await chartService.difficultyChart(itemAnalysis);

    await telegram.sendDocument(requestedByTelegramId.toString(), {
      source: xlsxBuffer,
      filename: `${test.title}-hisobot.xlsx`,
    });
    await telegram.sendPhoto(requestedByTelegramId.toString(), { source: scoreChart });
    await telegram.sendPhoto(requestedByTelegramId.toString(), { source: difficultyChart });
  },
  { connection },
);

reportWorker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'report job xato bilan tugadi'));
