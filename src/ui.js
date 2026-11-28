import { GrammyError, InlineKeyboard, Keyboard } from 'grammy';

export const MENU = {
  newTest: '➕ Test joylash',
  tests: '📋 Testlar',
  myTests: '📋 Testlarim',
  results: '📊 Natijalar',
  groups: '👥 Guruhlar',
  users: '🔍 Foydalanuvchilar',
  studentTests: '📝 Testlar',
};

export const MENU_TEXTS = new Set(Object.values(MENU));

export const adminMenu = new Keyboard()
  .text(MENU.newTest).text(MENU.tests).row()
  .text(MENU.results).text(MENU.groups).row()
  .text(MENU.users)
  .resized().persistent();

export const teacherMenu = new Keyboard()
  .text(MENU.newTest).text(MENU.myTests)
  .resized().persistent();

export const studentMenu = new Keyboard()
  .text(MENU.studentTests)
  .resized().persistent();

// Oddiy matn ishlatiladi (parse_mode yo'q): savollardagi maxsus belgilar xato bermaydi
const options = (keyboard) => ({ reply_markup: keyboard, link_preview_options: { is_disabled: true } });

// Tugma bosilgan bo'lsa xabarni tahrirlaydi, aks holda yangi xabar yuboradi.
// Xabar ID sini qaytaradi.
export async function show(ctx, text, keyboard) {
  const current = ctx.callbackQuery?.message?.message_id;
  if (current) {
    try {
      await ctx.editMessageText(text, options(keyboard));
      return current;
    } catch (error) {
      if (!(error instanceof GrammyError)) throw error;
      if (error.description.includes('message is not modified')) return current;
      // Tahrirlab bo'lmaydigan xabar: pastda yangisi yuboriladi
    }
  }
  const message = await ctx.reply(text, options(keyboard));
  return message.message_id;
}

// Tugma bosilganiga javob. Eskirgan so'rov xatosi e'tiborsiz qoldiriladi.
export async function ack(ctx, text, alert = false) {
  if (!ctx.callbackQuery) return;
  await ctx.answerCallbackQuery(text ? { text, show_alert: alert } : undefined).catch(() => {});
}

export const cut = (text, max = 60) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

// o‘, g‘ harflaridagi turli apostroflar bitta ko'rinishga keltiriladi (qidiruv ishlashi uchun)
export const clean = (text) => text.replace(/[‘’ʻʼ`´]/g, "'").replace(/\s+/g, ' ').trim();

// Sahifalangan tugmalar ro'yxati
export function pagedKeyboard(items, { page, label, data, pageData, perPage = 8, columns = 1 }) {
  const pages = Math.max(1, Math.ceil(items.length / perPage));
  const current = Math.min(Math.max(page, 0), pages - 1);
  const keyboard = new InlineKeyboard();

  items.slice(current * perPage, (current + 1) * perPage).forEach((item, index) => {
    keyboard.text(cut(label(item)), data(item, current));
    if ((index + 1) % columns === 0) keyboard.row();
  });
  keyboard.row();

  if (pages > 1) {
    if (current > 0) keyboard.text('⬅️', pageData(current - 1));
    keyboard.text(`${current + 1}/${pages}`, pageData(current));
    if (current < pages - 1) keyboard.text('➡️', pageData(current + 1));
    keyboard.row();
  }
  return keyboard;
}

// ---------- Sana va vaqt (Asia/Tashkent) ----------

const formatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Tashkent',
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

export function formatDate(value) {
  const parts = Object.fromEntries(formatter.formatToParts(new Date(value)).map((p) => [p.type, p.value]));
  return `${parts.day}.${parts.month}.${parts.year} ${parts.hour}:${parts.minute}`;
}

// "KK.OO.YYYY SS:DD" -> Date. Noto'g'ri bo'lsa null.
// O'zbekistonda yozgi vaqtga o'tish yo'q, shuning uchun +05:00 o'zgarmas.
export function parseDate(text) {
  const match = text.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const [, day, month, year, hour, minute] = match.map((v) => v.padStart(2, '0'));
  const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:00+05:00`);
  if (Number.isNaN(date.getTime())) return null;
  // 31.02 kabi mavjud bo'lmagan sanalarni rad etish
  return formatDate(date) === `${day}.${month}.${year} ${hour}:${minute}` ? date : null;
}

export function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}

export const percent = (correct, total) => (total ? Math.round((correct * 1000) / total) / 10 : 0);
