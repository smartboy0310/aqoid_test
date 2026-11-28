import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// Prisma ORM 7 talabi: PrismaClient endi driver adapter bilan ishga tushiriladi —
// adaptersiz `new PrismaClient()` xato beradi. PostgreSQL uchun rasmiy adapter: @prisma/adapter-pg.
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    adapter,
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

// Boshqa fayllar Prisma tiplarini endi '@prisma/client' dan emas, shu yerdan import qiladi —
// chunki Prisma 7'da generatsiya qilingan kod mahalliy papkaga (src/generated/prisma) chiqadi.
// Role qiymat sifatida ham ishlatilgani uchun (Role.ADMIN va h.k.) oddiy re-export, qolganlari faqat tip.
export { Role } from '../generated/prisma/client.js';
export type {
  TestStatus,
  AttemptStatus,
  User,
  Faculty,
  Group,
  Subject,
  Test,
  TestGroup,
  Question,
  Option,
  Attempt,
  Answer,
} from '../generated/prisma/client.js';
