import { Scenes } from 'telegraf';
import type { BotContext } from '../../types/context.js';
import { subjectRepository } from '../../repositories/subject.repository.js';
import { groupRepository } from '../../repositories/group.repository.js';
import { testService } from '../../services/test.service.js';
import { testSettingsSchema, scheduleSchema } from '../../validators/test.validator.js';
import { t } from '../../i18n/uz.js';
import {
  subjectKeyboard,
  groupMultiSelectKeyboard,
  confirmKeyboard,
} from '../keyboards/testCreation.keyboards.js';

export const testCreationScene = new Scenes.WizardScene<BotContext>(
  'testCreation',

  async (ctx) => {
    await ctx.reply(t.testCreate.askTitle);
    return ctx.wizard.next();
  },

  async (ctx) => {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text.trim() : undefined;
    if (!text || text.length < 3) {
      await ctx.reply(t.testCreate.invalidTitle);
      return;
    }
    ctx.scene.session.title = text;
    const subjects = await subjectRepository.findAll();
    await ctx.reply(t.testCreate.askSubject, subjectKeyboard(subjects));
    return ctx.wizard.next();
  },

  async (ctx) => {
    const data = ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text.trim() : undefined;

    if (ctx.scene.session.awaitingNewSubject) {
      if (!text || text.length < 2) {
        await ctx.reply(t.testCreate.invalidSubjectName);
        return;
      }
      const subject = await subjectRepository.findOrCreate(text);
      ctx.scene.session.subjectId = subject.id;
      ctx.scene.session.awaitingNewSubject = false;
      await ctx.reply(t.testCreate.askSettings);
      return ctx.wizard.next();
    }

    if (data === 'subject:new') {
      await ctx.answerCbQuery();
      ctx.scene.session.awaitingNewSubject = true;
      await ctx.reply(t.testCreate.askNewSubjectName);
      return;
    }

    if (data?.startsWith('subject:')) {
      await ctx.answerCbQuery();
      ctx.scene.session.subjectId = Number(data.split(':')[1]);
      await ctx.reply(t.testCreate.askSettings);
      return ctx.wizard.next();
    }

    await ctx.reply(t.registration.pressButton);
  },

  async (ctx) => {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : undefined;
    if (!text) {
      await ctx.reply(t.testCreate.pressOrType);
      return;
    }
    const parsed = testSettingsSchema.safeParse(text);
    if (!parsed.success) {
      await ctx.reply(t.testCreate.invalidSettings(parsed.error.issues[0].message));
      return;
    }
    ctx.scene.session.settings = parsed.data;
    await ctx.reply(t.testCreate.askSchedule);
    return ctx.wizard.next();
  },

  async (ctx) => {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : undefined;
    if (!text) {
      await ctx.reply(t.testCreate.pressOrType);
      return;
    }
    const parsed = scheduleSchema.safeParse(text);
    if (!parsed.success) {
      await ctx.reply(t.testCreate.invalidSchedule(parsed.error.issues[0].message));
      return;
    }
    ctx.scene.session.schedule = parsed.data;
    ctx.scene.session.selectedGroupIds = [];

    const groups = await groupRepository.findAll();
    if (groups.length === 0) {
      await ctx.reply(t.testCreate.noGroups);
      return ctx.scene.leave();
    }
    await ctx.reply(t.testCreate.askGroups, groupMultiSelectKeyboard(groups, []));
    return ctx.wizard.next();
  },

  async (ctx) => {
    const data = ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;
    if (!data) {
      await ctx.reply(t.registration.pressButton);
      return;
    }
    await ctx.answerCbQuery();

    if (data === 'groups:done') {
      if (ctx.scene.session.selectedGroupIds!.length === 0) {
        await ctx.answerCbQuery(t.testCreate.selectAtLeastOneGroup, { show_alert: true });
        return;
      }
      await ctx.editMessageText(testService.buildSummary(ctx.scene.session), confirmKeyboard());
      return ctx.wizard.next();
    }

    if (data.startsWith('group:')) {
      const groupId = Number(data.split(':')[1]);
      const selected = ctx.scene.session.selectedGroupIds!;
      const idx = selected.indexOf(groupId);
      if (idx >= 0) selected.splice(idx, 1);
      else selected.push(groupId);

      const groups = await groupRepository.findAll();
      const kb = groupMultiSelectKeyboard(groups, selected);
      await ctx.editMessageReplyMarkup(kb.reply_markup);
    }
  },

  async (ctx) => {
    const data = ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;
    if (data !== 'test_confirm' && data !== 'test_cancel') {
      await ctx.reply(t.registration.pressButton);
      return;
    }
    await ctx.answerCbQuery();

    if (data === 'test_cancel') {
      await ctx.editMessageText(t.testCreate.cancelled);
      return ctx.scene.leave();
    }

    const s = ctx.scene.session;
    const test = await testService.createTestWithGroups({
      title: s.title!,
      subjectId: s.subjectId!,
      authorId: ctx.dbUser!.id,
      ...s.settings!,
      ...s.schedule!,
      groupIds: s.selectedGroupIds!,
    });

    await ctx.editMessageText(t.testCreate.created(test.title));
    return ctx.scene.enter('questionImport', { testId: test.id });
  },
);
