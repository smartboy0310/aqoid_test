import { Composer, InlineKeyboard } from 'grammy';
import { isAdminId } from './config.js';
import { one, query, setState } from './db.js';
import { findTest, showTestCard, showTestList, startEditTest } from './teacher.js';
import { closeExpired } from './student.js';
import { decideTeacherRequest } from './requests.js';
import {
  MENU, ack, clean, pagedKeyboard, show, studentMenu, teacherMenu,
} from './ui.js';

// Bu bo'limga faqat ADMIN_IDS dagi foydalanuvchilar kiradi (index.js da tekshiriladi)
export const admin = new Composer();

// ---------- Testlarni to'xtatish, o'chirish, sozlash ----------

admin.callbackQuery(/^a:edit:(\d+)$/, async (ctx) => {
  await ack(ctx);
  // Vaqti o'tgan urinishlar yangi sozlama bilan "tirilib" qolmasligi uchun
  await closeExpired(ctx.api);
  await startEditTest(ctx, Number(ctx.match[1]));
});

admin.callbackQuery(/^a:(stop|del):(\d+)$/, async (ctx) => {
  await ack(ctx);
  const [, action, id] = ctx.match;
  const test = await findTest(ctx, id);
  if (!test) return show(ctx, 'Test topilmadi.');

  const question = action === 'stop'
    ? `«${test.title}» testi to'xtatilsinmi?\nHozir ishlayotganlar (${test.running}) testi yakunlanadi.`
    : `«${test.title}» testi o'chirilsinmi?\n⚠️ Barcha natijalar (${test.finished + test.running}) ham o'chadi. ` +
      'Kerak bo\'lsa, avval Excel faylni yuklab oling.';
  const keyboard = new InlineKeyboard()
    .text('✅ Ha', `a:${action}yes:${id}`)
    .text("❌ Yo'q", `t:card:${id}`);
  await show(ctx, question, keyboard);
});

admin.callbackQuery(/^a:stopyes:(\d+)$/, async (ctx) => {
  await ack(ctx);
  await query(
    'UPDATE tests SET stopped_at = now() WHERE id = $1 AND stopped_at IS NULL AND ends_at > now()',
    [ctx.match[1]],
  );
  await closeExpired(ctx.api);
  await showTestCard(ctx, Number(ctx.match[1]), "⛔️ Test to'xtatildi.");
});

admin.callbackQuery(/^a:delyes:(\d+)$/, async (ctx) => {
  await ack(ctx);
  await query('DELETE FROM tests WHERE id = $1', [ctx.match[1]]);
  await show(ctx, "🗑 Test o'chirildi.", new InlineKeyboard().text("⬅️ Ro'yxatga", 't:list:c:0'));
});

// ---------- Natijalar ----------

admin.hears(MENU.results, async (ctx) => {
  const keyboard = new InlineKeyboard()
    .text("Test bo'yicha", 't:list:r:0')
    .text("Guruh bo'yicha", 'a:rg:0').row()
    .text('📥 Barcha natijalar (Excel)', 'x:0:0');
  await ctx.reply("Natijalarni qanday ko'rasiz?", { reply_markup: keyboard });
});

admin.callbackQuery(/^a:rg:(\d+)$/, async (ctx) => {
  await ack(ctx);
  const groups = await query('SELECT id, name FROM groups ORDER BY name');
  const keyboard = pagedKeyboard(groups, {
    page: Number(ctx.match[1]),
    perPage: 20,
    columns: 2,
    label: (g) => g.name,
    data: (g) => `r:0:${g.id}:0`,
    pageData: (p) => `a:rg:${p}`,
  });
  await show(ctx, groups.length ? 'Guruhni tanlang:' : "Hali guruhlar yo'q.", keyboard);
});

// ---------- Guruhlar ----------

async function showGroups(ctx, page, note) {
  const groups = await query(
    `SELECT g.id, g.name, count(u.id)::int AS members
     FROM groups g LEFT JOIN users u ON u.group_id = g.id
     GROUP BY g.id ORDER BY g.name`,
  );
  const keyboard = pagedKeyboard(groups, {
    page,
    perPage: 20,
    columns: 2,
    label: (g) => `${g.name} (${g.members})`,
    data: (g) => `a:g:${g.id}`,
    pageData: (p) => `a:gl:${p}`,
  });
  keyboard.text("➕ Guruh qo'shish", 'a:gadd');
  const text = `${note ? `${note}\n\n` : ''}Guruhlar soni: ${groups.length}`;
  await show(ctx, text, keyboard);
}

admin.hears(MENU.groups, (ctx) => showGroups(ctx, 0));

admin.callbackQuery(/^a:gl:(\d+)$/, async (ctx) => {
  await ack(ctx);
  await setState(ctx, null);
  await showGroups(ctx, Number(ctx.match[1]));
});

admin.callbackQuery(/^a:g:(\d+)$/, async (ctx) => {
  await ack(ctx);
  const group = await one(
    `SELECT g.id, g.name, (SELECT count(*)::int FROM users u WHERE u.group_id = g.id) AS members
     FROM groups g WHERE g.id = $1`,
    [ctx.match[1]],
  );
  if (!group) return showGroups(ctx, 0, 'Guruh topilmadi.');

  const keyboard = new InlineKeyboard()
    .text('✏️ Tahrirlash', `a:gedit:${group.id}`)
    .text("🗑 O'chirish", `a:gdel:${group.id}`).row()
    .text('⬅️ Guruhlar', 'a:gl:0');
  await show(ctx, `Guruh: ${group.name}\nTalabalar: ${group.members}`, keyboard);
});

const cancelGroup = () => new InlineKeyboard().text('❌ Bekor qilish', 'a:gl:0');

admin.callbackQuery('a:gadd', async (ctx) => {
  await ack(ctx);
  await setState(ctx, 'adm:gadd');
  await show(ctx, 'Yangi guruh nomini yozing:', cancelGroup());
});

admin.callbackQuery(/^a:gedit:(\d+)$/, async (ctx) => {
  await ack(ctx);
  await setState(ctx, 'adm:gedit', { groupId: Number(ctx.match[1]) });
  await show(ctx, 'Guruhning yangi nomini yozing:', cancelGroup());
});

admin.callbackQuery(/^a:gdel:(\d+)$/, async (ctx) => {
  await ack(ctx);
  const group = await one('SELECT id, name FROM groups WHERE id = $1', [ctx.match[1]]);
  if (!group) return showGroups(ctx, 0, 'Guruh topilmadi.');
  const keyboard = new InlineKeyboard()
    .text('✅ Ha', `a:gdelyes:${group.id}`)
    .text("❌ Yo'q", `a:g:${group.id}`);
  await show(
    ctx,
    `«${group.name}» guruhi o'chirilsinmi?\nTalabalar guruhni qayta tanlaydi. Eski natijalar saqlanib qoladi.`,
    keyboard,
  );
});

admin.callbackQuery(/^a:gdelyes:(\d+)$/, async (ctx) => {
  await ack(ctx);
  await query('DELETE FROM groups WHERE id = $1', [ctx.match[1]]);
  await showGroups(ctx, 0, "🗑 Guruh o'chirildi.");
});

// ---------- O'qituvchi so'rovlari ----------

admin.callbackQuery(/^a:treq:(\d+):(\d+):([01])$/, async (ctx) => {
  const [, userId, requestNo, value] = ctx.match;
  const approve = value === '1';
  const user = await decideTeacherRequest(userId, requestNo, approve);

  await ack(ctx);
  if (!user) {
    return show(ctx, "ℹ️ Bu so'rov allaqachon ko'rib chiqilgan yoki bekor qilingan.");
  }
  await show(ctx, `${user.full_name}\n${approve ? '✅ Tasdiqlandi' : '❌ Rad etildi'}`);

  if (user.is_blocked) return;
  if (approve) {
    await notify(ctx, userId, "✅ So'rovingiz tasdiqlandi. Siz o'qituvchisiz.", teacherMenu);
  } else {
    await notify(
      ctx,
      userId,
      "❌ O'qituvchi bo'lish so'rovingiz rad etildi.\nTalaba sifatida ro'yxatdan o'tishingiz mumkin.",
      new InlineKeyboard().text("Talaba sifatida ro'yxatdan o'tish", 's:role:student'),
    );
  }
});

// ---------- Foydalanuvchilar ----------

async function searchUsers(ctx, search, page) {
  // % va _ belgilari oddiy harf sifatida qidiriladi
  const pattern = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
  const users = await query(
    `SELECT u.id, u.full_name, u.is_blocked, g.name AS group_name
     FROM users u LEFT JOIN groups g ON g.id = u.group_id
     WHERE u.full_name IS NOT NULL AND (u.full_name ILIKE $1 OR g.name ILIKE $1)
     ORDER BY u.full_name LIMIT 500`,
    [pattern],
  );
  const keyboard = pagedKeyboard(users, {
    page,
    label: (u) => `${u.is_blocked ? '🚫 ' : ''}${u.full_name} (${u.group_name ?? '—'})`,
    data: (u) => `a:u:${u.id}`,
    pageData: (p) => `a:ul:${p}`,
  });
  await show(ctx, `«${search}» bo'yicha topildi: ${users.length}\nBoshqa qidiruv uchun yangi matn yozing.`, keyboard);
}

async function showUser(ctx, userId, note) {
  const user = await one(
    `SELECT u.*, g.name AS group_name FROM users u LEFT JOIN groups g ON g.id = u.group_id
     WHERE u.id = $1`,
    [userId],
  );
  if (!user) return show(ctx, 'Foydalanuvchi topilmadi.');

  const targetIsAdmin = isAdminId(user.id);
  let role = 'Talaba';
  if (targetIsAdmin) role = 'Admin';
  else if (user.is_teacher) role = "O'qituvchi";
  else if (user.teacher_request === 'pending') role = "O'qituvchi (tasdiq kutilmoqda)";
  const text =
    `${note ? `${note}\n\n` : ''}` +
    `${user.full_name ?? '—'}\n` +
    `Guruh: ${user.group_name ?? '—'}\n` +
    `Username: ${user.username ? `@${user.username}` : '—'}\n` +
    `ID: ${user.id}\n` +
    `Rol: ${role}\n` +
    `Holati: ${user.is_blocked ? '🚫 Cheklangan' : '✅ Faol'}`;

  const keyboard = new InlineKeyboard();
  if (!targetIsAdmin) {
    // Tugmada kerakli qiymat ko'rsatiladi: ikki marta bosish holatni qaytarib yubormaydi
    keyboard
      .text(user.is_blocked ? '✅ Cheklovni olish' : '🚫 Cheklash', `a:ublock:${user.id}:${user.is_blocked ? 0 : 1}`)
      .row()
      .text(
        user.is_teacher ? "O'qituvchi rolini bekor qilish" : "O'qituvchi rolini berish",
        `a:uteach:${user.id}:${user.is_teacher ? 0 : 1}`,
      )
      .row()
      .text("♻️ Qayta ro'yxatdan o'tkazish", `a:ureset:${user.id}`)
      .row();
  }
  keyboard.text('⬅️ Qidiruv natijalari', 'a:ul:0');
  await show(ctx, text, keyboard);
}

// Foydalanuvchiga xabar yuboradi (botni bloklagan bo'lsa, xato e'tiborsiz qoldiriladi)
const notify = (ctx, userId, text, keyboard) =>
  ctx.api.sendMessage(userId, text, { reply_markup: keyboard }).catch(() => {});

admin.hears(MENU.users, async (ctx) => {
  await setState(ctx, 'adm:usearch');
  await ctx.reply('Ism (familiya) yoki guruh nomini yozing:');
});

admin.callbackQuery(/^a:ul:(\d+)$/, async (ctx) => {
  await ack(ctx);
  const search = ctx.user.state === 'adm:usearch' ? ctx.user.data.search : undefined;
  if (search === undefined) return show(ctx, `Qidirish uchun «${MENU.users}» tugmasini bosing.`);
  await searchUsers(ctx, search, Number(ctx.match[1]));
});

admin.callbackQuery(/^a:u:(\d+)$/, async (ctx) => {
  await ack(ctx);
  await showUser(ctx, ctx.match[1]);
});

admin.callbackQuery(/^a:ublock:(\d+):([01])$/, async (ctx) => {
  const [, userId, value] = ctx.match;
  if (isAdminId(userId)) return ack(ctx, "Adminni cheklab bo'lmaydi.", true);
  await ack(ctx);
  await query('UPDATE users SET is_blocked = $2 WHERE id = $1', [userId, value === '1']);
  await showUser(ctx, userId);
});

admin.callbackQuery(/^a:uteach:(\d+):([01])$/, async (ctx) => {
  const [, userId, value] = ctx.match;
  if (isAdminId(userId)) return ack(ctx, "Adminning roli o'zgartirilmaydi.", true);
  await ack(ctx);
  const teacher = value === '1';
  // Rol bekor qilinsa, foydalanuvchi qayta so'rov yubora olmaydi
  const changed = await one(
    `UPDATE users SET is_teacher = $2, state = NULL, data = '{}',
       teacher_request = CASE WHEN $2 THEN NULL ELSE 'rejected' END
     WHERE id = $1 AND is_teacher <> $2 RETURNING is_blocked`,
    [userId, teacher],
  );
  if (changed && !changed.is_blocked) {
    await notify(
      ctx,
      userId,
      teacher ? "Sizga o'qituvchi roli berildi." : "O'qituvchi rolingiz bekor qilindi. /start bosing.",
      teacher ? teacherMenu : studentMenu,
    );
  }
  await showUser(ctx, userId);
});

admin.callbackQuery(/^a:ureset:(\d+)$/, async (ctx) => {
  const userId = ctx.match[1];
  if (isAdminId(userId)) return ack(ctx, 'Admin uchun mumkin emas.', true);
  await ack(ctx);
  await query(
    `UPDATE users SET full_name = NULL, group_id = NULL, is_teacher = FALSE,
       teacher_request = NULL, state = NULL, data = '{}'
     WHERE id = $1`,
    [userId],
  );
  await showUser(ctx, userId, "♻️ Foydalanuvchi /start bosib, ro'yxatdan qayta o'tadi.");
});

// ---------- Matn kiritish ----------

admin.on('message:text', async (ctx, next) => {
  const { state, data } = ctx.user;
  if (!state?.startsWith('adm:')) return next();
  const text = clean(ctx.message.text);

  if (state === 'adm:usearch') {
    if (text.length < 2 || text.length > 100) return ctx.reply('Kamida 2 ta belgi yozing.');
    await setState(ctx, state, { search: text });
    return searchUsers(ctx, text, 0);
  }

  if (!text || text.length > 50) return ctx.reply('Guruh nomi 1 dan 50 tagacha belgi bo\'lsin.');
  try {
    if (state === 'adm:gadd') {
      await query('INSERT INTO groups (name) VALUES ($1)', [text]);
    } else {
      await query('UPDATE groups SET name = $2 WHERE id = $1', [data.groupId, text]);
    }
  } catch (error) {
    // 23505 — bunday nom allaqachon mavjud
    if (error.code === '23505') return ctx.reply('Bunday nomli guruh bor. Boshqa nom yozing.');
    throw error;
  }
  await setState(ctx, null);
  await showGroups(ctx, 0, '✅ Saqlandi.');
});
