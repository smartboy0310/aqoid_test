import { Markup } from 'telegraf';
import type { Faculty, Group } from '../../db/prisma.js';

export function facultyKeyboard(faculties: Faculty[]) {
  return Markup.inlineKeyboard(
    faculties.map((f) => [Markup.button.callback(f.name, `faculty:${f.id}`)]),
  );
}

export function courseKeyboard() {
  return Markup.inlineKeyboard(
    [[1, 2], [3, 4]].map((row) =>
      row.map((n) => Markup.button.callback(`${n}-kurs`, `course:${n}`)),
    ),
  );
}

export function groupKeyboard(groups: Group[]) {
  const buttons = groups.map((g) => Markup.button.callback(g.name, `group:${g.id}`));
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) rows.push(buttons.slice(i, i + 2));
  return Markup.inlineKeyboard(rows);
}

export function confirmKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('✅ Tasdiqlash', 'reg_confirm')],
    [Markup.button.callback('❌ Bekor qilish', 'reg_cancel')],
  ]);
}
