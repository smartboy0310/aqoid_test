import { Scenes } from 'telegraf';
import type { BotContext } from '../../types/context.js';
import { fullNameSchema } from '../../validators/registration.validator.js';
import { facultyRepository } from '../../repositories/faculty.repository.js';
import { groupRepository } from '../../repositories/group.repository.js';
import { authService } from '../../services/auth.service.js';
import { t } from '../../i18n/uz.js';
import {
  facultyKeyboard,
  courseKeyboard,
  groupKeyboard,
  confirmKeyboard,
} from '../keyboards/registration.keyboards.js';
import { studentMainMenu } from '../keyboards/student.keyboards.js';

export const registrationScene = new Scenes.WizardScene<BotContext>(
  'registration',

  async (ctx) => {
    await ctx.reply(t.registration.askFullName);
    return ctx.wizard.next();
  },

  async (ctx) => {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : undefined;
    if (!text) {
      await ctx.reply(t.registration.pressButton);
      return;
    }
    const parsed = fullNameSchema.safeParse(text);
    if (!parsed.success) {
      await ctx.reply(t.registration.invalidFullName);
      return;
    }
    ctx.scene.session.fullName = parsed.data;

    const faculties = await facultyRepository.findAll();
    if (faculties.length === 0) {
      await ctx.reply(t.registration.noFaculties);
      return ctx.scene.leave();
    }
    await ctx.reply(t.registration.askFaculty, facultyKeyboard(faculties));
    return ctx.wizard.next();
  },

  async (ctx) => {
    const data = ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;
    if (!data?.startsWith('faculty:')) {
      await ctx.reply(t.registration.pressButton);
      return;
    }
    await ctx.answerCbQuery();
    ctx.scene.session.facultyId = Number(data.split(':')[1]);
    await ctx.editMessageText(t.registration.askCourse, courseKeyboard());
    return ctx.wizard.next();
  },

  async (ctx) => {
    const data = ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;
    if (!data?.startsWith('course:')) {
      await ctx.reply(t.registration.pressButton);
      return;
    }
    await ctx.answerCbQuery();
    const course = Number(data.split(':')[1]);
    ctx.scene.session.course = course;

    const groups = await groupRepository.findByFacultyAndCourse(ctx.scene.session.facultyId!, course);
    if (groups.length === 0) {
      await ctx.editMessageText(t.registration.noGroupsForSelection);
      return ctx.scene.leave();
    }
    await ctx.editMessageText(t.registration.askGroup, groupKeyboard(groups));
    return ctx.wizard.next();
  },

  async (ctx) => {
    const data = ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;
    if (!data?.startsWith('group:')) {
      await ctx.reply(t.registration.pressButton);
      return;
    }
    await ctx.answerCbQuery();
    const groupId = Number(data.split(':')[1]);
    ctx.scene.session.groupId = groupId;

    const group = await groupRepository.findById(groupId);
    if (!group) {
      await ctx.editMessageText("Xatolik: guruh topilmadi. /start orqali qaytadan boshlang.");
      return ctx.scene.leave();
    }

    await ctx.editMessageText(
      t.registration.confirmSummary(
        ctx.scene.session.fullName!,
        group.faculty.name,
        ctx.scene.session.course!,
        group.name,
      ),
      confirmKeyboard(),
    );
    return ctx.wizard.next();
  },

  async (ctx) => {
    const data = ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;
    if (data !== 'reg_confirm' && data !== 'reg_cancel') {
      await ctx.reply(t.registration.pressButton);
      return;
    }
    await ctx.answerCbQuery();

    if (data === 'reg_cancel') {
      await ctx.editMessageText(t.registration.cancelled);
      return ctx.scene.leave();
    }

    const { fullName, groupId } = ctx.scene.session;
    await authService.registerStudent({
      telegramId: ctx.from!.id,
      fullName: fullName!,
      groupId: groupId!,
    });
    await ctx.editMessageText(t.registration.confirmed);
    await ctx.reply('Asosiy menyu:', studentMainMenu());
    return ctx.scene.leave();
  },
);
