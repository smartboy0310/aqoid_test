import { Markup } from 'telegraf';
import type { Subject, Group } from '@prisma/client';

export function subjectKeyboard(subjects: Subject[]) {
  const rows = subjects.map((s) => [Markup.button.callback(s.name, `subject:${s.id}`)]);
  rows.push([Markup.button.callback("➕ Yangi fan qo'shish", 'subject:new')]);
  return Markup.inlineKeyboard(rows);
}

export function groupMultiSelectKeyboard(groups: Group[], selected: number[]) {
  const rows = groups.map((g) => [
    Markup.button.callback(`${selected.includes(g.id) ? '✅ ' : ''}${g.name}`, `group:${g.id}`),
  ]);
  rows.push([Markup.button.callback('➡️ Tayyor', 'groups:done')]);
  return Markup.inlineKeyboard(rows);
}

export function confirmKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('✅ Tasdiqlash', 'test_confirm')],
    [Markup.button.callback('❌ Bekor qilish', 'test_cancel')],
  ]);
}
