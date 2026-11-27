import type { BotContext } from '../../../types/context.js';
import { attemptService } from '../../../services/attempt.service.js';

export async function reviewHandler(ctx: BotContext) {
  const attemptId = Number((ctx.match as RegExpMatchArray)[1]);
  await ctx.answerCbQuery();

  const wrongAnswers = await attemptService.getWrongAnswersReview(attemptId);
  if (wrongAnswers.length === 0) {
    await ctx.reply('Barcha savollarga to\'g\'ri javob berdingiz! 🎉');
    return;
  }

  for (const ans of wrongAnswers) {
    const correct = ans.question.options.find((o) => o.isCorrect);
    const lines = [
      `❓ ${ans.question.text}`,
      `Sizning javobingiz: ${ans.selectedOption?.text ?? '(javob berilmagan)'}`,
      `To'g'ri javob: ${correct?.text ?? '-'}`,
    ];
    if (ans.question.explanation) lines.push(`💡 ${ans.question.explanation}`);
    await ctx.reply(lines.join('\n'));
  }
}
