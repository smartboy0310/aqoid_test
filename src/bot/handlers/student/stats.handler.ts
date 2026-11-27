import type { BotContext } from '../../../types/context.js';
import { analyticsService } from '../../../services/analytics.service.js';
import { t } from '../../../i18n/uz.js';

export async function statsHandler(ctx: BotContext) {
  const stats = await analyticsService.getStudentAnalytics(ctx.dbUser!.id);
  if (stats.avgScore === null) {
    await ctx.reply(t.stats.noAttempts);
    return;
  }

  const lines = [
    `📈 Sizning statistikangiz:`,
    ``,
    `O'rtacha ball: ${stats.avgScore}%`,
    ``,
    `💪 Kuchli fanlar:`,
    ...stats.strongSubjects.map((s) => `  • ${s.subject}: ${s.avg}%`),
    ``,
    `📉 E'tibor talab qiladigan fanlar:`,
    ...stats.weakSubjects.map((s) => `  • ${s.subject}: ${s.avg}%`),
  ];
  await ctx.reply(lines.join('\n'));
}
