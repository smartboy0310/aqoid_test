import type { MiddlewareFn } from 'telegraf';
import type { BotContext } from '../../types/context.js';

const WINDOW_MS = 3000;
const MAX_REQUESTS = 5;
const hits = new Map<number, number[]>();

export const rateLimitMiddleware: MiddlewareFn<BotContext> = async (ctx, next) => {
  const userId = ctx.from?.id;
  if (!userId) return next();

  const now = Date.now();
  const timestamps = (hits.get(userId) ?? []).filter((ts) => now - ts < WINDOW_MS);
  timestamps.push(now);
  hits.set(userId, timestamps);

  if (timestamps.length > MAX_REQUESTS) return;

  return next();
};
