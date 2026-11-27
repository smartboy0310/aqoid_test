import { Markup } from 'telegraf';
import type { BotContext } from '../../../types/context.js';
import { testRepository } from '../../../repositories/test.repository.js';

export async function myTestsHandler(ctx: BotContext) {
  const tests = await testRepository.findByAuthor(ctx.dbUser!.id);
  const lines = tests.map((x) => `• ${x.title} — ${x.status}`).join('\n') || "Hali testlaringiz yo'q.";
  await ctx.reply(lines, Markup.inlineKeyboard([[Markup.button.callback('➕ Yangi test yaratish', 'test:new')]]));
}
