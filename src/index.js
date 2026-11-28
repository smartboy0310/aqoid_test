import { Bot } from 'grammy';
import { run, sequentialize } from '@grammyjs/runner';
import { autoRetry } from '@grammyjs/auto-retry';
import { config, isAdminId } from './config.js';
import { initDb, pool, setState, upsertUser } from './db.js';
import { admin } from './admin.js';
import { staff } from './teacher.js';
import { closeExpired, student, studentHome } from './student.js';
import { MENU_TEXTS, ack, adminMenu, teacherMenu } from './ui.js';

const TIMER_INTERVAL = 3000;

const bot = new Bot(config.botToken);

// Telegram "juda ko'p so'rov" (429) desa, kutib qayta yuboradi
bot.api.config.use(autoRetry({ maxRetryAttempts: 3, maxDelaySeconds: 60 }));

// Turli foydalanuvchilar parallel, bitta foydalanuvchining so'rovlari esa navbat bilan bajariladi
bot.use(sequentialize((ctx) => (ctx.from ? String(ctx.from.id) : undefined)));

// Bot faqat shaxsiy chatda ishlaydi
const app = bot
  .on(['message', 'callback_query:data'])
  .filter((ctx) => ctx.chat?.type === 'private');

// Har bir so'rovda rol va cheklov holati bazadan tekshiriladi
app.use(async (ctx, next) => {
  ctx.user = await upsertUser(ctx.from);
  ctx.isAdmin = isAdminId(ctx.from.id);
  ctx.isStaff = ctx.isAdmin || ctx.user.is_teacher;

  if (ctx.user.is_blocked && !ctx.isAdmin) {
    const text = 'Botdan foydalanishingiz cheklangan.';
    if (ctx.callbackQuery) await ack(ctx, text, true);
    else await ctx.reply(text, { reply_markup: { remove_keyboard: true } });
    return;
  }
  await next();
});

// Menyu tugmasi yoki buyruq bosilsa, tugallanmagan kiritish bekor qilinadi
app.use(async (ctx, next) => {
  const text = ctx.message?.text;
  if (text && ctx.user.state && (MENU_TEXTS.has(text) || text.startsWith('/'))) {
    await setState(ctx, null);
  }
  await next();
});

async function home(ctx) {
  if (ctx.isAdmin) return ctx.reply('Admin paneli. Kerakli bo\'limni tanlang.', { reply_markup: adminMenu });
  if (ctx.isStaff) return ctx.reply("O'qituvchi bo'limi. Kerakli bo'limni tanlang.", { reply_markup: teacherMenu });
  return studentHome(ctx);
}

app.command('start', home);

// Rol bo'yicha yo'naltirish
app.filter((ctx) => ctx.isAdmin).use(admin);
app.filter((ctx) => ctx.isStaff).use(staff);
app.filter((ctx) => !ctx.isStaff).use(student);

// Hech bir bo'limga tushmagan so'rovlar
app.on('callback_query:data', (ctx) => ack(ctx, 'Bu tugma eskirgan yoki sizga ruxsat berilmagan.', true));
app.on('message', home);

bot.catch(async ({ ctx, error }) => {
  console.error(`Xato (update ${ctx.update.update_id}):`, error);
  const text = "Xatolik yuz berdi. Birozdan keyin qayta urinib ko'ring.";
  try {
    if (ctx.callbackQuery) await ack(ctx, text, true);
    else await ctx.reply(text);
  } catch {
    // foydalanuvchiga xabar yuborib bo'lmadi
  }
});

await initDb();
await bot.init();
await bot.api.deleteWebhook();

const runner = run(bot);
console.log(`Bot ishga tushdi: @${bot.botInfo.username}`);

// Taymer: vaqti tugagan testlarni yopadi. Qayta ishga tushganda ham darhol ishlaydi.
let timer;
let stopping = false;
async function tick() {
  try {
    await closeExpired(bot.api);
  } catch (error) {
    console.error('Taymer xatosi:', error.message);
  }
  if (!stopping) timer = setTimeout(tick, TIMER_INTERVAL);
}
tick();

async function shutdown() {
  if (stopping) return;
  stopping = true;
  clearTimeout(timer);
  console.log("Bot to'xtatilmoqda...");
  if (runner.isRunning()) await runner.stop();
  await pool.end();
  process.exit(0);
}
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

// Yangilanishlarni olish butunlay to'xtasa, jarayon yopiladi va pm2 uni qayta ishga tushiradi
runner.task()?.catch((error) => {
  console.error('Bot to\'xtab qoldi:', error);
  process.exit(1);
});
