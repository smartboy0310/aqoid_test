import { Scenes, Markup } from 'telegraf';
import type { BotContext } from '../../types/context.js';
import { enqueueBroadcast } from '../../queues/broadcast.queue.js';
import { userRepository } from '../../repositories/user.repository.js';
import { t } from '../../i18n/uz.js';

function audienceKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('👥 Barchaga', 'bc:ALL')],
    [Markup.button.callback('🎓 Faqat talabalarga', 'bc:STUDENT')],
    [Markup.button.callback("👨‍🏫 Faqat o'qituvchilarga", 'bc:TEACHER')],
  ]);
}

function confirmKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('✅ Yuborish', 'bc_confirm')],
    [Markup.button.callback('❌ Bekor qilish', 'bc_cancel')],
  ]);
}

export const broadcastScene = new Scenes.WizardScene<BotContext>(
  'broadcast',

  async (ctx) => {
    await ctx.reply(t.broadcast.chooseAudience, audienceKeyboard());
    return ctx.wizard.next();
  },

  async (ctx) => {
    const data = ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;
    if (!data?.startsWith('bc:')) {
      await ctx.reply(t.registration.pressButton);
      return;
    }
    await ctx.answerCbQuery();
    ctx.scene.session.broadcastTarget = data.split(':')[1] as 'ALL' | 'STUDENT' | 'TEACHER';
    await ctx.editMessageText(t.broadcast.askText);
    return ctx.wizard.next();
  },

  async (ctx) => {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : undefined;
    if (!text) {
      await ctx.reply(t.registration.pressButton);
      return;
    }
    ctx.scene.session.broadcastText = text;
    const count = await userRepository.countForBroadcast(ctx.scene.session.broadcastTarget!);
    await ctx.reply(t.broadcast.confirm(count, text), confirmKeyboard());
    return ctx.wizard.next();
  },

  async (ctx) => {
    const data = ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;
    if (data !== 'bc_confirm' && data !== 'bc_cancel') {
      await ctx.reply(t.registration.pressButton);
      return;
    }
    await ctx.answerCbQuery();
    if (data === 'bc_cancel') {
      await ctx.editMessageText(t.broadcast.cancelled);
      return ctx.scene.leave();
    }
    await enqueueBroadcast(ctx.scene.session.broadcastTarget!, ctx.scene.session.broadcastText!, ctx.from!.id);
    await ctx.editMessageText(t.broadcast.sending);
    return ctx.scene.leave();
  },
);
