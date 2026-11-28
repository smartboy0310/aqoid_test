// Test joylash va natijalar. Bu bo'lim o'qituvchi va admin uchun umumiy.
// O'qituvchi faqat o'z testlarini, admin barcha testlarni ko'radi.
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Composer, InlineKeyboard, InputFile } from 'grammy';
import { config } from './config.js';
import { one, query, setState, tx } from './db.js';
import { parseTest } from './parser.js';
import { buildReport } from './excel.js';
import {
  MENU, ack, clean, formatDate, pagedKeyboard, parseDate, percent, show,
} from './ui.js';

export const staff = new Composer();

const SAMPLE_FILE = fileURLToPath(new URL('../namuna_test.txt', import.meta.url));
const MAX_FILE_SIZE = 1024 * 1024;
const RESULTS_PER_PAGE = 10;

// ---------- Test joylash bosqichlari ----------

// Har bir bosqich tugmasida "wid" bor: eski xabardagi tugma yangi jarayonga ta'sir qilmaydi
const button = (data, action, arg) => `w:${data.wid}:${action}${arg === undefined ? '' : `:${arg}`}`;
const totalQuestions = (data) => data.questions?.length ?? data.total;

async function stepContent(step, data) {
  const keyboard = new InlineKeyboard();
  const cancel = () => keyboard.row().text('❌ Bekor qilish', button(data, 'cancel'));
  const sample = () => keyboard.text('📄 Namuna fayl', button(data, 'sample'));
  let text;

  if (step === 'subject') {
    text = 'Fan nomini yozing:';
    sample();
  } else if (step === 'title') {
    text = 'Test nomini yozing:';
  } else if (step === 'file') {
    text = 'Savollar yozilgan .txt faylni yuboring (UTF-8).';
    sample();
  } else if (step === 'confirm') {
    text = `✅ Fayl tekshirildi.\nSavollar soni: ${data.questions.length}\n\nTasdiqlaysizmi?`;
    keyboard.text('✅ Tasdiqlash', button(data, 'confirm'));
  } else if (step === 'groups') {
    const groups = await query('SELECT id, name FROM groups ORDER BY name');
    const list = pagedKeyboard(groups, {
      page: data.page ?? 0,
      perPage: 20,
      columns: 2,
      label: (g) => `${data.groups.includes(g.id) ? '✅ ' : ''}${g.name}`,
      data: (g) => button(data, 'group', g.id),
      pageData: (p) => button(data, 'page', p),
    });
    list.text('➡️ Davom etish', button(data, 'next')).row().text('❌ Bekor qilish', button(data, 'cancel'));
    text = groups.length
      ? `Guruh(lar)ni tanlang. Tanlandi: ${data.groups.length}`
      : "Hali guruhlar yo'q. Avval admin guruh qo'shishi kerak.";
    return [text, list];
  } else if (step === 'start') {
    text = 'Boshlanish sanasi va vaqtini yozing (Toshkent vaqti).\nFormat: 25.12.2026 09:00';
    keyboard.text('🕒 Hozir', button(data, 'now'));
  } else if (step === 'end') {
    text = `Boshlanish: ${formatDate(data.startsAt)}\n\nTugash sanasi va vaqtini yozing.\nFormat: 25.12.2026 18:00`;
  } else if (step === 'duration') {
    text = 'Testni ishlash davomiyligini daqiqada yozing (1–600):';
  } else if (step === 'count') {
    const total = totalQuestions(data);
    text = `Talabaga nechta savol tushsin? (1–${total})`;
    keyboard.text(`Hammasi (${total})`, button(data, 'all'));
  } else if (step === 'save') {
    const groups = await query('SELECT name FROM groups WHERE id = ANY($1::int[]) ORDER BY name', [data.groups]);
    text =
      `Tekshiring:\n\nFan: ${data.subject}\nTest: ${data.title}\n` +
      `Guruhlar: ${groups.map((g) => g.name).join(', ')}\n` +
      `Boshlanish: ${formatDate(data.startsAt)}\nTugash: ${formatDate(data.endsAt)}\n` +
      `Davomiyligi: ${data.duration} daqiqa\nSavollar: ${data.count} / ${totalQuestions(data)}`;
    keyboard.text('💾 Saqlash', button(data, 'save'));
  }

  cancel();
  return [text, keyboard];
}

async function goStep(ctx, step, data, note) {
  await setState(ctx, `wiz:${step}`, data);
  const [text, keyboard] = await stepContent(step, data);
  await show(ctx, note ? `${note}\n\n${text}` : text, keyboard);
}

const newWizardId = () => randomBytes(4).toString('hex');

// Mavjud test sozlamalarini o'zgartirish (faqat admin chaqiradi)
export async function startEditTest(ctx, testId) {
  const test = await findTest(ctx, testId);
  if (!test) return show(ctx, 'Test topilmadi.');
  const groups = await query('SELECT group_id FROM test_groups WHERE test_id = $1', [testId]);
  await goStep(ctx, 'groups', {
    wid: newWizardId(),
    testId: test.id,
    subject: test.subject,
    title: test.title,
    total: test.total,
    groups: groups.map((g) => g.group_id),
  });
}

async function saveTest(ctx, data) {
  return tx(async (db) => {
    const values = [data.startsAt, data.endsAt, data.duration, data.count];
    let testId = data.testId;

    if (testId) {
      const updated = await db.query(
        `UPDATE tests SET starts_at = $1, ends_at = $2, duration_min = $3, question_count = $4,
                          stopped_at = NULL
         WHERE id = $5`,
        [...values, testId],
      );
      if (updated.rowCount === 0) return null;
      await db.query('DELETE FROM test_groups WHERE test_id = $1', [testId]);
    } else {
      const inserted = await db.query(
        `INSERT INTO tests (starts_at, ends_at, duration_min, question_count, subject, title, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [...values, data.subject, data.title, ctx.from.id],
      );
      testId = inserted.rows[0].id;
      await db.query(
        `INSERT INTO questions (test_id, text, options, correct)
         SELECT $1, q->>'text', q->'options', (q->>'correct')::int
         FROM jsonb_array_elements($2::jsonb) AS q`,
        [testId, JSON.stringify(data.questions)],
      );
    }

    await db.query(
      'INSERT INTO test_groups (test_id, group_id) SELECT $1, id FROM groups WHERE id = ANY($2::int[])',
      [testId, data.groups],
    );
    return testId;
  });
}

// ---------- Testlar ro'yxati va test kartochkasi ----------

// Rol tekshiruvi so'rov ichida: o'qituvchi birovning testini ola olmaydi
export function findTest(ctx, testId) {
  return one(
    `SELECT t.*,
       (SELECT count(*)::int FROM questions q WHERE q.test_id = t.id) AS total,
       (SELECT string_agg(g.name, ', ' ORDER BY g.name)
          FROM test_groups tg JOIN groups g ON g.id = tg.group_id
          WHERE tg.test_id = t.id) AS group_names,
       (SELECT count(*)::int FROM attempts a
          WHERE a.test_id = t.id AND a.finished_at IS NOT NULL) AS finished,
       (SELECT count(*)::int FROM attempts a
          WHERE a.test_id = t.id AND a.finished_at IS NULL) AS running
     FROM tests t
     WHERE t.id = $1 AND ($2::boolean OR t.created_by = $3)`,
    [testId, ctx.isAdmin, ctx.from.id],
  );
}

function testStatus(test) {
  if (test.stopped_at) return "⛔️ To'xtatilgan";
  if (Date.now() < test.starts_at.getTime()) return '🕒 Kutilmoqda';
  if (Date.now() >= test.ends_at.getTime()) return '🏁 Yakunlangan';
  return '🟢 Faol';
}

// mode: 'c' — kartochka ochiladi, 'r' — natijalar ochiladi
export async function showTestList(ctx, mode, page) {
  const tests = await query(
    `SELECT id, subject, title FROM tests
     WHERE $1::boolean OR created_by = $2
     ORDER BY id DESC`,
    [ctx.isAdmin, ctx.from.id],
  );
  if (tests.length === 0) return show(ctx, "Hali testlar yo'q.");

  const keyboard = pagedKeyboard(tests, {
    page,
    label: (t) => `${t.subject} — ${t.title}`,
    data: (t) => (mode === 'r' ? `r:${t.id}:0:0` : `t:card:${t.id}`),
    pageData: (p) => `t:list:${mode}:${p}`,
  });
  await show(ctx, 'Testni tanlang:', keyboard);
}

export async function showTestCard(ctx, testId, note) {
  const test = await findTest(ctx, testId);
  if (!test) return show(ctx, 'Test topilmadi.');

  const text =
    (note ? `${note}\n\n` : '') +
    `${test.subject}\n${test.title}\n\n` +
    `Holati: ${testStatus(test)}\n` +
    `Guruhlar: ${test.group_names ?? '—'}\n` +
    `Boshlanish: ${formatDate(test.starts_at)}\n` +
    `Tugash: ${formatDate(test.ends_at)}\n` +
    `Davomiyligi: ${test.duration_min} daqiqa\n` +
    `Savollar: ${test.question_count} / ${test.total}\n` +
    `Yakunlaganlar: ${test.finished}, ishlayotganlar: ${test.running}`;

  const keyboard = new InlineKeyboard().text('📊 Natijalar', `r:${test.id}:0:0`).row();
  if (ctx.isAdmin) {
    keyboard.text('⚙️ Sozlamalar', `a:edit:${test.id}`).row();
    if (!test.stopped_at && Date.now() < test.ends_at.getTime()) {
      keyboard.text("⛔️ To'xtatish", `a:stop:${test.id}`);
    }
    keyboard.text("🗑 O'chirish", `a:del:${test.id}`).row();
  }
  keyboard.text('⬅️ Ro\'yxatga', 't:list:c:0');
  await show(ctx, text, keyboard);
}

// ---------- Natijalar ----------

// testId yoki groupId 0 bo'lsa, shu bo'yicha filtr qo'llanmaydi
async function canSeeResults(ctx, testId) {
  if (ctx.isAdmin) return true;
  return testId !== 0 && Boolean(await findTest(ctx, testId));
}

function loadResults(testId, groupId) {
  return query(
    `SELECT a.full_name, COALESCE(g.name, a.group_name) AS group_name, t.subject, t.title,
            a.correct, a.total, a.started_at, a.finished_at
     FROM attempts a
     JOIN tests t ON t.id = a.test_id
     LEFT JOIN groups g ON g.id = a.group_id
     WHERE a.finished_at IS NOT NULL
       AND ($1::int = 0 OR a.test_id = $1)
       AND ($2::int = 0 OR a.group_id = $2)
     ORDER BY t.id DESC, group_name, a.full_name`,
    [testId, groupId],
  );
}

async function showResults(ctx, testId, groupId, page) {
  const rows = await loadResults(testId, groupId);
  const pages = Math.max(1, Math.ceil(rows.length / RESULTS_PER_PAGE));
  const current = Math.min(page, pages - 1);
  const first = current * RESULTS_PER_PAGE;

  const header = [];
  if (testId) {
    const test = await findTest(ctx, testId);
    if (!test) return show(ctx, 'Test topilmadi.');
    header.push(`Test: ${test.subject} — ${test.title}`);
  }
  if (groupId) {
    const group = await one('SELECT name FROM groups WHERE id = $1', [groupId]);
    header.push(`Guruh: ${group?.name ?? '—'}`);
  }

  const lines = rows.slice(first, first + RESULTS_PER_PAGE).map((row, i) => {
    const testName = testId ? '' : `\n    ${row.subject} — ${row.title}`;
    return `${first + i + 1}. ${row.full_name} (${row.group_name}) — ` +
      `${row.correct}/${row.total}, ${percent(row.correct, row.total)}%${testName}`;
  });

  const keyboard = new InlineKeyboard();
  if (pages > 1) {
    if (current > 0) keyboard.text('⬅️', `r:${testId}:${groupId}:${current - 1}`);
    keyboard.text(`${current + 1}/${pages}`, `r:${testId}:${groupId}:${current}`);
    if (current < pages - 1) keyboard.text('➡️', `r:${testId}:${groupId}:${current + 1}`);
    keyboard.row();
  }
  if (rows.length > 0) keyboard.text('📥 Excel yuklab olish', `x:${testId}:${groupId}`).row();

  // Bitta test natijalarini guruh bo'yicha saralash tugmalari
  if (testId) {
    const groups = await query(
      `SELECT DISTINCT g.id, g.name FROM attempts a JOIN groups g ON g.id = a.group_id
       WHERE a.test_id = $1 ORDER BY g.name LIMIT 40`,
      [testId],
    );
    if (groups.length > 1) {
      groups.forEach((g, i) => {
        keyboard.text(`${g.id === groupId ? '✅ ' : ''}${g.name}`, `r:${testId}:${g.id}:0`);
        if (i % 2 === 1) keyboard.row();
      });
      keyboard.row().text('Barcha guruhlar', `r:${testId}:0:0`).row();
    }
    keyboard.text('⬅️ Testga', `t:card:${testId}`);
  }

  const body = lines.length ? `${lines.join('\n')}\n\nJami: ${rows.length}` : "Hali yakunlangan natijalar yo'q.";
  await show(ctx, `📊 Natijalar\n${header.join('\n')}\n\n${body}`, keyboard);
}

// ---------- Handlerlar ----------

staff.hears(MENU.newTest, (ctx) => goStep(ctx, 'subject', { wid: newWizardId(), groups: [] }));
staff.hears([MENU.tests, MENU.myTests], (ctx) => showTestList(ctx, 'c', 0));
// Adminning "Natijalar" tugmasi admin.js da qayta ishlanadi, bu yerga o'qituvchiniki keladi
staff.hears(MENU.results, (ctx) => showTestList(ctx, 'r', 0));

staff.callbackQuery(/^t:list:([cr]):(\d+)$/, async (ctx) => {
  await ack(ctx);
  await showTestList(ctx, ctx.match[1], Number(ctx.match[2]));
});

staff.callbackQuery(/^t:card:(\d+)$/, async (ctx) => {
  await ack(ctx);
  await showTestCard(ctx, Number(ctx.match[1]));
});

staff.callbackQuery(/^r:(\d+):(\d+):(\d+)$/, async (ctx) => {
  const [, testId, groupId, page] = ctx.match.map(Number);
  if (!(await canSeeResults(ctx, testId))) return ack(ctx, "Ruxsat yo'q.", true);
  await ack(ctx);
  await showResults(ctx, testId, groupId, page);
});

staff.callbackQuery(/^x:(\d+):(\d+)$/, async (ctx) => {
  const [, testId, groupId] = ctx.match.map(Number);
  if (!(await canSeeResults(ctx, testId))) return ack(ctx, "Ruxsat yo'q.", true);

  const rows = await loadResults(testId, groupId);
  if (rows.length === 0) return ack(ctx, "Natijalar yo'q.", true);
  await ack(ctx, 'Fayl tayyorlanmoqda…');

  const date = formatDate(new Date()).replace(/[ .:]/g, '-');
  await ctx.replyWithDocument(new InputFile(await buildReport(rows), `natijalar_${date}.xlsx`), {
    caption: `Natijalar soni: ${rows.length}`,
  });
});

staff.callbackQuery(/^w:([0-9a-f]+):([a-z]+)(?::(\d+))?$/, async (ctx) => {
  const [, wid, action, arg] = ctx.match;
  const { state, data } = ctx.user;
  if (!state?.startsWith('wiz:') || data.wid !== wid) return ack(ctx, 'Bu tugma eskirgan.');
  const step = state.slice(4);

  if (action === 'sample') {
    await ack(ctx);
    return ctx.replyWithDocument(new InputFile(SAMPLE_FILE, 'namuna_test.txt'), {
      caption: "To'g'ri javob oldiga # qo'yiladi. Variantlar ==== bilan, savollar +++++ bilan ajratiladi.",
    });
  }
  if (action === 'cancel') {
    await ack(ctx);
    await setState(ctx, null);
    return show(ctx, '❌ Bekor qilindi.');
  }

  // Har bir amal faqat o'z bosqichida ishlaydi
  const allowed = {
    confirm: 'confirm', group: 'groups', page: 'groups', next: 'groups',
    now: 'start', all: 'count', save: 'save',
  };
  if (allowed[action] !== step) return ack(ctx, 'Bu tugma eskirgan.');

  if (action === 'next' && data.groups.length === 0) return ack(ctx, 'Kamida bitta guruh tanlang.', true);
  await ack(ctx);

  if (action === 'confirm') return goStep(ctx, 'groups', data);
  if (action === 'group') {
    const id = Number(arg);
    data.groups = data.groups.includes(id) ? data.groups.filter((g) => g !== id) : [...data.groups, id];
    return goStep(ctx, 'groups', data);
  }
  if (action === 'page') return goStep(ctx, 'groups', { ...data, page: Number(arg) });
  if (action === 'next') return goStep(ctx, 'start', data);
  if (action === 'now') return goStep(ctx, 'end', { ...data, startsAt: new Date().toISOString() });
  if (action === 'all') return goStep(ctx, 'save', { ...data, count: totalQuestions(data) });

  // action === 'save'
  if (new Date(data.endsAt) <= new Date()) {
    return goStep(ctx, 'end', data, "Tugash vaqti o'tib ketgan.");
  }
  const groupCount = await one('SELECT count(*)::int AS n FROM groups WHERE id = ANY($1::int[])', [data.groups]);
  if (groupCount.n === 0) {
    return goStep(ctx, 'groups', { ...data, groups: [] }, "Tanlangan guruhlar o'chirilgan.");
  }
  const testId = await saveTest(ctx, data);
  await setState(ctx, null);
  if (!testId) return show(ctx, "Test topilmadi (o'chirilgan bo'lishi mumkin).");
  await showTestCard(ctx, testId, '✅ Saqlandi.');
});

staff.on('message:document', async (ctx, next) => {
  if (ctx.user.state !== 'wiz:file') return next();

  const document = ctx.message.document;
  if (!document.file_name?.toLowerCase().endsWith('.txt')) {
    return ctx.reply('Faqat .txt fayl yuboring.');
  }
  if (document.file_size > MAX_FILE_SIZE) return ctx.reply('Fayl hajmi 1 MB dan oshmasligi kerak.');

  const file = await ctx.getFile();
  const response = await fetch(`https://api.telegram.org/file/bot${config.botToken}/${file.file_path}`, {
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) return ctx.reply("Faylni yuklab bo'lmadi. Qayta yuboring.");

  let content;
  try {
    content = new TextDecoder('utf-8', { fatal: true }).decode(await response.arrayBuffer());
  } catch {
    return ctx.reply('Fayl UTF-8 kodlashida emas. Uni UTF-8 formatida saqlab, qayta yuboring.');
  }

  const { questions, errors } = parseTest(content);
  if (errors.length > 0) {
    const shown = errors.slice(0, 15).join('\n');
    const more = errors.length > 15 ? `\n…yana ${errors.length - 15} ta xato.` : '';
    return ctx.reply(`❌ Test saqlanmadi. Xatolar:\n\n${shown}${more}\n\nFaylni tuzatib, qayta yuboring.`);
  }
  await goStep(ctx, 'confirm', { ...ctx.user.data, questions });
});

staff.on('message:text', async (ctx, next) => {
  const { state, data } = ctx.user;
  if (!state?.startsWith('wiz:')) return next();
  const step = state.slice(4);
  const text = ctx.message.text.trim();

  if (step === 'subject' || step === 'title') {
    const value = clean(text);
    if (!value || value.length > 100) return ctx.reply('1 dan 100 tagacha belgi yozing.');
    return goStep(ctx, step === 'subject' ? 'title' : 'file', { ...data, [step]: value });
  }

  if (step === 'start' || step === 'end') {
    const date = parseDate(text);
    if (!date) return ctx.reply("Noto'g'ri format. Masalan: 25.12.2026 09:00");
    if (step === 'start') return goStep(ctx, 'end', { ...data, startsAt: date.toISOString() });
    if (date <= new Date(data.startsAt)) return ctx.reply("Tugash vaqti boshlanishdan keyin bo'lishi kerak.");
    if (date <= new Date()) return ctx.reply("Tugash vaqti o'tib ketgan. Kelajakdagi vaqtni yozing.");
    return goStep(ctx, 'duration', { ...data, endsAt: date.toISOString() });
  }

  if (step === 'duration' || step === 'count') {
    const max = step === 'duration' ? 600 : totalQuestions(data);
    const number = Number(text);
    if (!/^\d+$/.test(text) || number < 1 || number > max) {
      return ctx.reply(`1 dan ${max} gacha butun son yozing.`);
    }
    return goStep(ctx, step === 'duration' ? 'count' : 'save', { ...data, [step]: number });
  }

  await ctx.reply(step === 'file' ? 'Matn emas, .txt fayl yuboring.' : 'Yuqoridagi tugmalardan foydalaning.');
});
