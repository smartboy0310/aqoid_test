import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['warn', 'error'],
  });

if (env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

prisma
  .$connect()
  .then(() => logger.info('PostgreSQL ulanishi muvaffaqiyatli'))
  .catch((err) => {
    logger.error({ err }, 'PostgreSQL ulanishida xatolik');
    process.exit(1);
  });
