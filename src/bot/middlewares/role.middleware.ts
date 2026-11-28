import type { MiddlewareFn } from 'telegraf';
import type { Role } from '../../db/prisma.js';
import type { BotContext } from '../../types/context.js';
import { t } from '../../i18n/uz.js';

export const requireRole = (allowed: Role[]): MiddlewareFn<BotContext> => {
  return async (ctx, next) => {
    if (!ctx.dbUser) {
      await ctx.reply(t.auth.notRegistered);
      return;
    }
    if (!allowed.includes(ctx.dbUser.role)) {
      await ctx.reply(t.auth.forbidden);
      return;
    }
    return next();
  };
};
