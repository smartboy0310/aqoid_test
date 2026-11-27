import { Markup } from 'telegraf';
import type { BotContext } from '../../../types/context.js';
import { attemptService, AttemptError } from '../../../services/attempt.service.js';

function questionKeyboard(attemptId: number, questionId: number, options: { id: number; text: string }[]) {
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const rows = options.map((o, i) => [
    Markup.button.callback(`${letters[i]}) ${o.text}`, `ans:${attemptId}:${questionId}:${o.id}`),
  ]);
  return Markup.inlineKeyboard(rows);
}

function reviewKeyboard(attemptId: number, hasWrong: boolean) {
  if (!hasWrong) return undefined;
  return Markup.inlineKeyboard([[Markup.button.callback("📖 Xatolarni ko'rish", `review:${attemptId}`)]]);
}

export async function sendQuestion(ctx: BotContext, attemptId: number) {
  const view = await attemptService.getQuestionView(attemptId);
  if (!view || view.expired) return;

  await ctx.reply(
    `Savol ${view.index + 1}/${view.total}\n\n${view.text}\n\n⏱ Qolgan vaqt: ${view.remainingLabel}`,
    questionKeyboard(view.attemptId, view.questionId, view.options),
  );
}

export async function startTestHandler(ctx: BotContext) {
  const testId = Number((ctx.match as RegExpMatchArray)[1]);
  await ctx.answerCbQuery();

  try {
    const { attempt, resumed } = await attemptService.startAttempt(
      ctx.dbUser!.id,
      testId,
      ctx.dbUser!.groupId,
    );
    if (resumed) await ctx.reply('Tugallanmagan urinishingiz topildi, davom etamiz.');
    await sendQuestion(ctx, attempt.id);
  } catch (err) {
    if (err instanceof AttemptError) {
      await ctx.reply(`❗ ${err.message}`);
      return;
    }
    throw err;
  }
}

export async function answerHandler(ctx: BotContext) {
  const [, attemptIdStr, questionIdStr, optionIdStr] = ctx.match as RegExpMatchArray;
  const attemptId = Number(attemptIdStr);
  const questionId = Number(questionIdStr);
  const optionId = Number(optionIdStr);

  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(undefined).catch(() => {});

  const result = await attemptService.submitAnswer(attemptId, questionId, optionId);

  if (result.status === 'STALE' || result.status === 'ALREADY_FINISHED') return;

  if (result.status === 'EXPIRED' || result.status === 'FINISHED') {
    if (result.result) {
      await ctx.reply(
        result.result.message,
        reviewKeyboard(attemptId, result.result.correctCount < result.result.total),
      );
    }
    return;
  }

  await sendQuestion(ctx, attemptId);
}
