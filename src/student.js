import { Composer, InlineKeyboard } from 'grammy';
import {
  availableTests, currentQuestion, expiredAttempts, finishAttempt, finishedAttempt,
  one, query, saveAnswer, setAttemptMessage, setState, startAttempt,
} from './db.js';
import { isAdminId } from './config.js';
import {
  MENU, ack, clean, formatDate, formatDuration, pagedKeyboard, percent, show, studentMenu,
} from './ui.js';

export const student = new Composer();

const LETTERS = 'ABCDEF';
const isRegistered = (user) => Boolean(user.full_name && user.group_id);

// Talabaning bosh sahifasi: ro'yxatdan o'tish yoki testlar ro'yxati
export async function studentHome(ctx) {
  if (!ctx.user.full_name) {
    await setState(ctx, 'reg:name');
    await ctx.reply('Assalomu alaykum! Ism va familiyangizni yozing.\nMasalan: Aliyev Vali', {
      reply_markup: { remove_keyboard: true },
    });
    return;
  }
  if (!ctx.user.group_id) {
    await askGroup(ctx, 0);
    return;
  }
  await showTests(ctx);
}

async function askGroup(ctx, page) {
  const groups = await query('SELECT id, name FROM groups ORDER BY name');
  if (groups.length === 0) {
    await show(ctx, "Hali guruhlar qo'shilmagan. Birozdan keyin /start bosing.");
    return;
  }
  const keyboard = pagedKeyboard(groups, {
    page,
    perPage: 20,
    columns: 2,
    label: (g) => g.name,
    data: (g) => `s:grp:${g.id}`,
    pageData: (p) => `s:gp:${p}`,
  });
  await show(ctx, 'Guruhingizni tanlang:', keyboard);
}

async function showTests(ctx) {
  const tests = await availableTests(ctx.user);
  if (tests.length === 0) {
    await ctx.reply("Hozircha siz uchun faol test yo'q.", { reply_markup: studentMenu });
    return;
  }
  const keyboard = new InlineKeyboard();
  for (const test of tests.slice(0, 30)) {
    const mark = test.started ? '▶️ Davom ettirish: ' : '';
    keyboard.text(`${mark}${test.subject} — ${test.title}`.slice(0, 60), `s:test:${test.id}`).row();
  }
  await ctx.reply('Faol testlar:', { reply_markup: keyboard });
}

const resultText = (result) =>
  `✅ Test yakunlandi\n${result.subject} — ${result.title}\n\n` +
  `To'g'ri javoblar: ${result.correct} / ${result.total}\n` +
  `Natija: ${percent(result.correct, result.total)}%`;

// Joriy savolni ko'rsatadi. Savol qolmagan yoki vaqt tugagan bo'lsa, natijani chiqaradi.
async function showQuestion(ctx, attemptId) {
  const question = await currentQuestion(attemptId, ctx.from.id);

  if (!question || question.seconds_left <= 0) {
    await finishAttempt(attemptId);
    const result = await finishedAttempt(attemptId, ctx.from.id);
    if (result) await show(ctx, resultText(result));
    return;
  }

  const lines = question.option_order.map((original, i) => `${LETTERS[i]}) ${question.options[original]}`);
  const text =
    `Savol ${question.position} / ${question.total}\n` +
    `⏳ Qolgan vaqt: ${formatDuration(question.seconds_left)}\n\n` +
    `${question.text}\n\n${lines.join('\n')}`;

  const keyboard = new InlineKeyboard();
  question.option_order.forEach((_, i) => {
    keyboard.text(LETTERS[i], `q:${attemptId}:${question.position}:${i}`);
  });

  const messageId = await show(ctx, text, keyboard);
  await setAttemptMessage(attemptId, messageId);
}

// Vaqti tugagan urinishlarni yopadi va talabaga natijani yuboradi (taymer chaqiradi)
export async function closeExpired(api) {
  const closed = [];
  // Avval hammasi bazada yopiladi, keyin xabarlar yuboriladi
  for (const attempt of await expiredAttempts()) {
    if (await finishAttempt(attempt.id)) closed.push(attempt);
  }

  for (const attempt of closed) {
    if (attempt.is_blocked && !isAdminId(attempt.user_id)) continue;
    try {
      const result = await finishedAttempt(attempt.id, attempt.user_id);
      if (!result) continue;
      const text = `⏰ Test vaqti tugadi.\n\n${resultText(result)}`;
      try {
        if (!result.message_id) throw new Error('xabar yo\'q');
        await api.editMessageText(attempt.user_id, Number(result.message_id), text);
      } catch {
        await api.sendMessage(attempt.user_id, text);
      }
    } catch (error) {
      console.error(`Natijani yuborib bo'lmadi (${attempt.user_id}):`, error.message);
    }
  }
}

// ---------- Ro'yxatdan o'tish ----------

student.on('message:text', async (ctx, next) => {
  if (ctx.user.state !== 'reg:name') return next();

  const name = clean(ctx.message.text);
  const valid = name.length <= 100 && /^[\p{L}'.-]+( [\p{L}'.-]+)+$/u.test(name);
  if (!valid) {
    await ctx.reply('Ism va familiyani harflar bilan, orasida bo\'sh joy qoldirib yozing.\nMasalan: Aliyev Vali');
    return;
  }
  await query('UPDATE users SET full_name = $2 WHERE id = $1', [ctx.from.id, name]);
  ctx.user.full_name = name;
  await setState(ctx, null);
  await studentHome(ctx);
});

student.callbackQuery(/^s:gp:(\d+)$/, async (ctx) => {
  await ack(ctx);
  if (ctx.user.full_name && !ctx.user.group_id) await askGroup(ctx, Number(ctx.match[1]));
});

student.callbackQuery(/^s:grp:(\d+)$/, async (ctx) => {
  // Guruh faqat bir marta tanlanadi
  if (!ctx.user.full_name || ctx.user.group_id) return ack(ctx, 'Bu tugma eskirgan.');

  const group = await one(
    `UPDATE users u SET group_id = g.id FROM groups g
     WHERE u.id = $1 AND g.id = $2 AND u.group_id IS NULL
     RETURNING g.id, g.name`,
    [ctx.from.id, ctx.match[1]],
  );
  if (!group) {
    await ack(ctx, 'Guruh topilmadi.', true);
    return askGroup(ctx, 0);
  }
  await ack(ctx);
  ctx.user.group_id = group.id;
  await show(ctx, `✅ Ro'yxatdan o'tdingiz.\n${ctx.user.full_name}\nGuruh: ${group.name}`);
  await showTests(ctx);
});

// ---------- Test ishlash ----------

student.hears(MENU.studentTests, studentHome);

student.callbackQuery(/^s:test:(\d+)$/, async (ctx) => {
  if (!isRegistered(ctx.user)) return ack(ctx, "Avval ro'yxatdan o'ting: /start", true);

  const tests = await availableTests(ctx.user);
  const test = tests.find((t) => t.id === Number(ctx.match[1]));
  if (!test) return ack(ctx, "Bu test siz uchun hozir mavjud emas yoki uni ishlab bo'lgansiz.", true);
  await ack(ctx);

  const text =
    `${test.subject}\n${test.title}\n\n` +
    `Savollar soni: ${test.question_count}\n` +
    `Ajratilgan vaqt: ${test.duration_min} daqiqa\n` +
    `Test yopilishi: ${formatDate(test.ends_at)}\n\n` +
    (test.started
      ? 'Siz bu testni boshlagansiz. Vaqt davom etmoqda.'
      : 'Diqqat: urinish faqat bitta. Orqaga qaytib bo\'lmaydi. Test yopilish vaqtida avtomatik yakunlanadi.');
  const keyboard = new InlineKeyboard().text(
    test.started ? '▶️ Davom ettirish' : '▶️ Boshlash',
    `s:go:${test.id}`,
  );
  await show(ctx, text, keyboard);
});

student.callbackQuery(/^s:go:(\d+)$/, async (ctx) => {
  if (!isRegistered(ctx.user)) return ack(ctx, "Avval ro'yxatdan o'ting: /start", true);

  const attemptId = await startAttempt(Number(ctx.match[1]), ctx.user);
  if (!attemptId) return ack(ctx, 'Bu test hozir mavjud emas.', true);
  if (await finishedAttempt(attemptId, ctx.from.id)) {
    return ack(ctx, 'Siz bu testni ishlab bo\'lgansiz.', true);
  }
  await ack(ctx);
  await showQuestion(ctx, attemptId);
});

student.callbackQuery(/^q:(\d+):(\d+):([0-5])$/, async (ctx) => {
  const [, attemptId, position, choice] = ctx.match.map(Number);
  const status = await saveAnswer({
    attemptId,
    position,
    choice,
    userId: ctx.from.id,
    messageId: ctx.callbackQuery.message?.message_id,
  });

  if (status === 'notfound') return ack(ctx, 'Test topilmadi.', true);
  if (status === 'stale') {
    return ack(ctx, `Bu tugma eskirgan. Davom etish uchun «${MENU.studentTests}» tugmasini bosing.`, true);
  }
  await ack(ctx, status === 'closed' ? 'Test yakunlangan.' : undefined);
  await showQuestion(ctx, attemptId);
});
