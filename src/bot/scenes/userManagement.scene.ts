import { Scenes, Markup } from 'telegraf';
import type { BotContext } from '../../types/context.js';
import { adminService } from '../../services/admin.service.js';
import { t } from '../../i18n/uz.js';

type Action = 'promote' | 'demote' | 'block' | 'unblock';

const ACTION_LABELS: Record<Action, string> = {
  promote: t.userManagement.promoteLabel,
  demote: t.userManagement.demoteLabel,
  block: t.userManagement.blockLabel,
  unblock: t.userManagement.unblockLabel,
};

function actionMenuKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("🎓 O'qituvchi qilib tayinlash", 'um:promote')],
    [Markup.button.callback('🔙 Talaba qilib qaytarish', 'um:demote')],
    [Markup.button.callback('🚫 Bloklash', 'um:block')],
    [Markup.button.callback('✅ Blokdan chiqarish', 'um:unblock')],
  ]);
}

function userPickKeyboard(users: { id: number; fullName: string; role: string }[]) {
  return Markup.inlineKeyboard(
    users.map((u) => [Markup.button.callback(`${u.fullName} (${u.role})`, `um_pick:${u.id}`)]),
  );
}

function confirmKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('✅ Tasdiqlash', 'um_confirm')],
    [Markup.button.callback('❌ Bekor qilish', 'um_cancel')],
  ]);
}

export const userManagementScene = new Scenes.WizardScene<BotContext>(
  'userManagement',

  async (ctx) => {
    await ctx.reply(t.userManagement.chooseAction, actionMenuKeyboard());
    return ctx.wizard.next();
  },

  async (ctx) => {
    const data = ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;
    if (!data?.startsWith('um:')) {
      await ctx.reply(t.registration.pressButton);
      return;
    }
    await ctx.answerCbQuery();
    ctx.scene.session.umAction = data.split(':')[1] as Action;
    await ctx.editMessageText(t.userManagement.askQuery);
    return ctx.wizard.next();
  },

  async (ctx) => {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text.trim() : undefined;
    if (!text) {
      await ctx.reply(t.registration.pressButton);
      return;
    }
    const users = await adminService.searchUsers(text);
    if (users.length === 0) {
      await ctx.reply(t.userManagement.notFound);
      return;
    }
    const action = ctx.scene.session.umAction as Action;
    if (users.length === 1) {
      ctx.scene.session.umTargetUserId = users[0].id;
      await ctx.reply(
        t.userManagement.confirm(users[0].fullName, users[0].role, ACTION_LABELS[action]),
        confirmKeyboard(),
      );
      return ctx.wizard.next();
    }
    await ctx.reply(t.userManagement.multipleFound, userPickKeyboard(users));
    return ctx.wizard.next();
  },

  async (ctx) => {
    const data = ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;
    const action = ctx.scene.session.umAction as Action;

    if (data?.startsWith('um_pick:')) {
      await ctx.answerCbQuery();
      const userId = Number(data.split(':')[1]);
      ctx.scene.session.umTargetUserId = userId;
      const user = await adminService.getUserById(userId);
      await ctx.editMessageText(
        t.userManagement.confirm(user!.fullName, user!.role, ACTION_LABELS[action]),
        confirmKeyboard(),
      );
      return;
    }

    if (data === 'um_confirm' || data === 'um_cancel') {
      await ctx.answerCbQuery();
      if (data === 'um_cancel') {
        await ctx.editMessageText(t.userManagement.cancelled);
        return ctx.scene.leave();
      }

      const userId = ctx.scene.session.umTargetUserId!;
      const target = await adminService.getUserById(userId);
      if (target?.role === 'ADMIN') {
        await ctx.editMessageText(t.userManagement.protectedAdmin);
        return ctx.scene.leave();
      }

      if (action === 'promote') await adminService.promoteToTeacher(userId);
      if (action === 'demote') await adminService.demoteToStudent(userId);
      if (action === 'block') await adminService.blockUser(userId);
      if (action === 'unblock') await adminService.unblockUser(userId);

      await ctx.editMessageText(t.userManagement.done(ACTION_LABELS[action]));
      return ctx.scene.leave();
    }

    await ctx.reply(t.registration.pressButton);
  },
);
