# Deploy yo'riqnomasi (Ubuntu server)

Long polling tanlanganligi sabab, serverda hech qanday kiruvchi port ochish shart emas (webhook uchun kerak bo'ladigan Nginx + SSL + domen — kerak emas). Faqat SSH uchun port ochiq qolsa yetarli.

## 1. Tizimni tayyorlash

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential ufw
```

## 2. Node.js 20 o'rnatish

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # v20.x bo'lishi kerak
```

## 3. PostgreSQL o'rnatish

```bash
sudo apt install -y postgresql postgresql-contrib postgresql-client-16

sudo -u postgres psql << 'SQL'
CREATE USER tiu_bot WITH PASSWORD 'kuchli-parol-shu-yerga';
CREATE DATABASE tiu_bot OWNER tiu_bot;
SQL
```

PostgreSQL odatda faqat `localhost`da tinglaydi (standart sozlama) — buni o'zgartirmang, tashqaridan kirish shart emas.

## 4. Redis o'rnatish

```bash
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
redis-cli ping   # "PONG" qaytarishi kerak
```

## 5. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw enable
sudo ufw status
```

Boshqa hech qanday port ochilmaydi — bot va worker faqat tashqariga (Telegram API, pg_dump) ulanadi.

## 6. Loyihani serverga joylashtirish

```bash
cd /opt
sudo mkdir tiu-test-bot && sudo chown $USER:$USER tiu-test-bot
cd tiu-test-bot

git clone <sizning-repo-manzilingiz> .
# yoki: scp -r tiu-test-bot/* user@server:/opt/tiu-test-bot/
```

## 7. Muhit va bog'liqliklar

```bash
cp .env.example .env
nano .env   # BOT_TOKEN, DATABASE_URL, REDIS_URL, SUPER_ADMIN_TELEGRAM_ID

chmod 600 .env   # faqat egasi o'qiy oladi — maxfiy ma'lumotlar himoyasi

npm install
npm ls prisma @prisma/client   # 7.x ekanini tasdiqlang!
```

## 8. Baza

```bash
npx prisma generate
npx prisma migrate deploy   # production uchun 'dev' emas, 'deploy' ishlatiladi
npx prisma db seed          # faqat birinchi marta, real fakultet/guruh ro'yxati bilan
```

Ikki marta boshlashni DB darajasida bloklash uchun (tavsiya etiladi):

```bash
npx prisma migrate dev --name add_partial_unique_attempt --create-only
```

Hosil bo'lgan `migration.sql` fayliga qo'shing:

```sql
CREATE UNIQUE INDEX "attempts_user_test_in_progress_unique"
ON "attempts" ("userId", "testId")
WHERE "status" = 'IN_PROGRESS';
```

So'ng: `npx prisma migrate deploy`

## 9. Build va PM2

```bash
npm run build

npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # chiqqan buyruqni ko'chirib, alohida ishga tushiring (sudo talab qiladi)
```

## 10. Backup uchun pg_dump (admin panelidagi "💾 Backup" tugmasi uchun)

```bash
sudo apt install -y postgresql-client-16   # agar 3-qadamda o'rnatilmagan bo'lsa
pg_dump --version
```

## 11. Tekshirish

```bash
pm2 status        # ikkala jarayon ham "online" bo'lishi kerak
pm2 logs tiu-bot --lines 50
pm2 logs tiu-worker --lines 50
```

Telegramda botga `/start` yuboring — javob kelishi kerak.

## 12. Yangilash protsedurasi (keyingi versiyalar uchun)

```bash
cd /opt/tiu-test-bot
git pull
npm install
npx prisma migrate deploy
npm run build
pm2 reload ecosystem.config.cjs --update-env
```

`pm2 reload` (restart emas) — talabalar test topshirayotgan paytda ham jarayonni uzilishsiz yangilaydi.

## 13. Avtomatik kunlik zaxira (cron)

Admin panelidagi "💾 Backup" tugmasi qo'lda ishlaydi. Qo'shimcha xavfsizlik uchun — kunlik avtomatik zaxira:

```bash
mkdir -p /opt/tiu-test-bot/backups/auto
crontab -e
```

Qo'shing:

```
0 3 * * * pg_dump --dbname="postgresql://tiu_bot:parol@localhost:5432/tiu_bot" -F c -f /opt/tiu-test-bot/backups/auto/$(date +\%Y-\%m-\%d).dump
```

Har kuni soat 03:00da avtomatik zaxira yaratiladi.

## 14. Test bazasini sozlash (ixtiyoriy — integratsiya testlari uchun)

```bash
sudo -u postgres createdb tiu_bot_test
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE tiu_bot_test TO tiu_bot;"
cp .env.test.example .env.test

DOTENV_CONFIG_PATH=.env.test npx prisma migrate deploy

npm test                  # tezkor, bazasiz (unit testlar)
npm run test:integration  # Postgres + Redis kerak
```
