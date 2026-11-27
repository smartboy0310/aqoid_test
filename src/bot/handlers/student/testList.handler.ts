import { Markup } from 'telegraf';
import type { BotContext } from '../../../types/context.js';
import { testRepository } from '../../../repositories/test.repository.js';
import { attemptRepository } from '../../../repositories/attempt.repository.js';

export async function testListHandler(ctx: BotContext) {
  if (!ctx.dbUser?.groupId) {
    await ctx.reply('Sizda guruh belgilanmagan. Administratorga murojaat qiling.');
    return;
  }

  const tests = await testRepository.findAvailableForGroup(ctx.dbUser.groupId);
  if (tests.length === 0) {
    await ctx.reply("Hozircha sizga mo'ljallangan faol test yo'q.");
    return;
  }

  for (const test of tests) {
    const used = await attemptRepository.countFinished(ctx.dbUser.id, test.id);
    const left = test.maxAttempts - used;
    const active = await attemptRepository.findActive(ctx.dbUser.id, test.id);
    const label = active ? '▶️ Davom ettirish' : left > 0 ? '▶️ Boshlash' : null;

    const lines = [
      `📘 ${test.title}`,
      `Vaqt: ${Math.round(test.timeLimitSec / 60)} daqiqa`,
      `Qolgan urinishlar: ${Math.max(left, 0)}/${test.maxAttempts}`,
    ].join('\n');

    await ctx.reply(
      lines,
      label ? Markup.inlineKeyboard([[Markup.button.callback(label, `start_test:${test.id}`)]]) : undefined,
    );
  }
}
