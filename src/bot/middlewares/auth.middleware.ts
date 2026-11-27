import type { MiddlewareFn } from 'telegraf';
import type { BotContext } from '../../types/context.js';
import { prisma } from '../../db/prisma.js';
import { logger } from '../../utils/logger.js';
import { t } from '../../i18n/uz.js';

export const authMiddleware: MiddlewareFn<BotContext> = async (ctx, next) => {
  if (!ctx.from) return next();

  try {
    const user = await prisma.user.findUnique({ where: { telegramId: BigInt(ctx.from.id) } });
    ctx.dbUser = user;

    if (user?.isBlocked) {
      await ctx.reply(t.auth.blocked);
      return;
    }
  } catch (err) {
    logger.error({ err }, 'auth.middleware: foydalanuvchini topishda xatolik');
    ctx.dbUser = null;
  }

  return next();
};
