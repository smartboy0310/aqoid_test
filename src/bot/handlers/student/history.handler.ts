import type { BotContext } from '../../../types/context.js';
import { attemptRepository } from '../../../repositories/attempt.repository.js';

export async function historyHandler(ctx: BotContext) {
  const attempts = await attemptRepository.history(ctx.dbUser!.id);
  if (attempts.length === 0) {
    await ctx.reply('Hali hech qanday test topshirmagansiz.');
    return;
  }

  const lines = attempts.map((a) => {
    const date = a.finishedAt?.toLocaleDateString('uz-UZ') ?? '-';
    const status = a.status === 'EXPIRED' ? ' (vaqt tugadi)' : '';
    const passed = (a.score ?? 0) >= a.test.passScore;
    return `📘 ${a.test.title} — ${a.score}% ${passed ? '✅' : '❌'}${status} (${date})`;
  });

  await ctx.reply(['📊 Natijalaringiz:', '', ...lines].join('\n'));
}
