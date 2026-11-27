import type { BotContext } from '../../../types/context.js';
import { t } from '../../../i18n/uz.js';
import { studentMainMenu } from '../../keyboards/student.keyboards.js';
import { teacherMainMenu } from '../../keyboards/teacher.keyboards.js';
import { adminMainMenu } from '../../keyboards/admin.keyboards.js';

export async function startHandler(ctx: BotContext) {
  if (ctx.dbUser) {
    const menu =
      ctx.dbUser.role === 'ADMIN'
        ? adminMainMenu()
        : ctx.dbUser.role === 'TEACHER'
          ? teacherMainMenu()
          : studentMainMenu();

    await ctx.reply(t.registration.alreadyRegistered(ctx.dbUser.fullName), menu);
    return;
  }

  await ctx.scene.enter('registration');
}
