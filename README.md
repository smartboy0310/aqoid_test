# TIU Test Bot

Toshkent islom instituti talabalari uchun Telegram test boti — Node.js + TypeScript + Telegraf + PostgreSQL (Prisma) + Redis (BullMQ).

Ushbu zip — Claude bilan suhbat davomida 1–9-bosqichlarda ishlab chiqilgan **to'liq manba kod**. Loyihalash qarorlari, arxitektura asoslari va formulalarning izohi suhbatning o'zida keltirilgan — bu fayl faqat ishga tushirish qadamlarini jamlaydi. Production serverga joylashtirish uchun **DEPLOY.md** faylini ko'ring.

## Talablar

- Node.js **20.19+, 22.12+ yoki 24.0+** (Prisma ORM 7 ning aniq talabi — Node 22.x tavsiya etiladi)
- PostgreSQL
- Redis
- `chartjs-node-canvas` uchun tizim kutubxonalari: `sudo apt install -y pkg-config build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev`
- PM2 (production uchun): `npm install -g pm2`

## Tezkor boshlash (lokal development)

```bash
npm install
npm ls prisma @prisma/client   # 7.x ekanini tasdiqlang, 8 emas!

cp .env.example .env
# .env faylini haqiqiy qiymatlar bilan to'ldiring (BOT_TOKEN, DATABASE_URL, REDIS_URL, SUPER_ADMIN_TELEGRAM_ID)

npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed   # NAMUNA fakultet/guruhlarni kiritadi — prisma/seed.ts faylida real ma'lumot bilan almashtiring
```

Ikkita alohida terminalda:

```bash
npm run dev:bot
npm run dev:worker
```

## Muhim arxitektura eslatmasi (Prisma ORM 7)

Prisma Client bu loyihada `node_modules` ichiga emas, `src/generated/prisma` papkasiga generatsiya qilinadi (Prisma 7'ning `output` talabi), va ulanish `@prisma/adapter-pg` driver adapteri orqali amalga oshiriladi (`new PrismaClient()` adaptersiz Prisma 7'da xato beradi). Bularning barchasi `src/db/prisma.ts` va `prisma.config.ts` ichida allaqachon sozlangan — sizdan qo'shimcha ish talab qilinmaydi, `npx prisma generate` buyrug'ini bajarish yetarli.

## Testlash

```bash
npm test                  # unit testlar — tezkor, bazaga ulanmaydi
npm run test:integration  # integratsiya testlari — PostgreSQL + Redis kerak (.env.test sozlang, DEPLOY.md 14-bo'lim)
npm run test:all          # ikkalasi birga
```

## Production deploy

To'liq Ubuntu server yo'riqnomasi uchun **DEPLOY.md** ga qarang.

## Loyiha holati (1–9-bosqich, barchasi yakunlangan)

- ✅ Arxitektura, papka tuzilmasi, Prisma schema
- ✅ Ro'yxatdan o'tish, rollar (STUDENT / TEACHER / ADMIN)
- ✅ Test yaratish, Excel/CSV/Word'dan savol import qilish
- ✅ Test topshirish (timer, shuffle, qayta boshlashni bloklash)
- ✅ Tahlil moduli (Cronbach alpha, diskriminatsiya indeksi, distraktor tahlili) va Excel/grafik hisobot
- ✅ Admin paneli (foydalanuvchilarni boshqarish, broadcast, statistika, backup)
- ✅ Unit va integratsiya testlari, deploy yo'riqnomasi

## Papka tuzilmasi (qisqacha)

```
prisma/           Prisma schema va seed skripti
src/
  app.ts          Bot entrypoint (long polling)
  worker.ts       Worker entrypoint (BullMQ: attempt-timeout, reports, broadcast, backup)
  bot/            Telegraf: handlers, scenes, middlewares, keyboards
  services/       Biznes logika (Telegramdan mustaqil)
  repositories/   Faqat Prisma so'rovlari
  queues/         BullMQ producer/consumer juftliklari
  utils/          Sof funksiyalar (shuffle, timer, statistics, lock)
tests/
  integration/    Haqiqiy DB/Redis talab qiluvchi testlar
```

## Muhim eslatma

Bu kod ushbu suhbat muhitida (tarmoqsiz) ishga tushirib ko'rilmagan — `npm install` va bazaga ulanish talab qilingani uchun. Birinchi marta ishga tushirishda yuqoridagi buyruqlarni ketma-ket bajaring va xatoliklarni shu asosda tuzating.
