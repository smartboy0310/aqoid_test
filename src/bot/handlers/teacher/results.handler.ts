import { Markup } from 'telegraf';
import type { BotContext } from '../../../types/context.js';
import { testRepository } from '../../../repositories/test.repository.js';
import { prisma } from '../../../db/prisma.js';
import { enqueueReport } from '../../../queues/report.queue.js';
import { t } from '../../../i18n/uz.js';

export async function resultsMenuHandler(ctx: BotContext) {
  await ctx.reply(
    t.results.menu,
    Markup.inlineKeyboard([
      [Markup.button.callback('🔴 Jonli kuzatish', 'results:live')],
      [Markup.button.callback('📥 Excel hisobot', 'results:report')],
    ]),
  );
}

export async function liveTestListHandler(ctx: BotContext) {
  await ctx.answerCbQuery();
  const tests = await testRepository.findByAuthor(ctx.dbUser!.id);
  const published = tests.filter((x) => x.status === 'PUBLISHED');
  if (published.length === 0) {
    await ctx.reply(t.results.noActiveTests);
    return;
  }
  const rows = published.map((x) => [Markup.button.callback(`🔴 ${x.title}`, `live:${x.id}`)]);
  await ctx.reply(t.results.chooseTestForLive, Markup.inlineKeyboard(rows));
}

export async function liveMonitorHandler(ctx: BotContext) {
  const testId = Number((ctx.match as RegExpMatchArray)[1]);
  await ctx.answerCbQuery();

  const [inProgress, completed, testGroups] = await Promise.all([
    prisma.attempt.count({ where: { testId, status: 'IN_PROGRESS' } }),
    prisma.attempt.count({ where: { testId, status: { in: ['COMPLETED', 'EXPIRED'] } } }),
    prisma.testGroup.findMany({ where: { testId }, include: { group: { include: { users: true } } } }),
  ]);
  const totalStudents = testGroups.reduce((s, tg) => s + tg.group.users.length, 0);

  await ctx.reply(t.results.liveStatus(inProgress, completed, totalStudents));
}

export async function reportTestListHandler(ctx: BotContext) {
  await ctx.answerCbQuery();
  const tests = await testRepository.findByAuthor(ctx.dbUser!.id);
  if (tests.length === 0) {
    await ctx.reply(t.results.noTests);
    return;
  }
  const rows = tests.map((x) => [Markup.button.callback(`📊 ${x.title}`, `report:${x.id}`)]);
  await ctx.reply(t.results.chooseTestForReport, Markup.inlineKeyboard(rows));
}

export async function reportRequestHandler(ctx: BotContext) {
  const testId = Number((ctx.match as RegExpMatchArray)[1]);
  await ctx.answerCbQuery();
  await enqueueReport(testId, ctx.from!.id);
  await ctx.reply(t.results.reportPreparing);
}
