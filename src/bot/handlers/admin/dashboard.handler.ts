import type { BotContext } from '../../../types/context.js';
import { adminService } from '../../../services/admin.service.js';
import { t } from '../../../i18n/uz.js';

export async function dashboardHandler(ctx: BotContext) {
  const s = await adminService.getDashboardStats();
  const lines = [
    t.dashboard.title,
    '',
    `👨‍🎓 Talabalar: ${s.students}`,
    `👨‍🏫 O'qituvchilar: ${s.teachers}`,
    `🛡 Adminlar: ${s.admins}`,
    '',
    `🏛 Fakultetlar: ${s.faculties}`,
    `👥 Guruhlar: ${s.groups}`,
    `📚 Fanlar: ${s.subjects}`,
    '',
    `📝 Testlar: ${s.tests} (nashr qilingan: ${s.publishedTests})`,
    `✅ Topshirilgan urinishlar: ${s.attempts}`,
    `📈 O'rtacha ball (tizim bo'yicha): ${s.avgScore ?? '-'}%`,
  ];
  await ctx.reply(lines.join('\n'));
}
