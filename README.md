# Test bot — modul ta'lim tizimi

Telegram orqali test o'tkazadigan bot. Node.js, grammY, PostgreSQL, exceljs.

## Fayllar

| Fayl | Vazifasi |
|---|---|
| `src/index.js` | Ishga tushirish, rol va cheklovni tekshirish, taymer |
| `src/config.js` | `.env` sozlamalari |
| `src/db.js` | Baza jadvallari va test ishlash so'rovlari |
| `src/admin.js` | Testni boshqarish, guruhlar, foydalanuvchilar |
| `src/teacher.js` | Test joylash va natijalar (o'qituvchi va admin) |
| `src/student.js` | Ro'yxatdan o'tish va test ishlash |
| `src/parser.js` | `.txt` test faylini o'qish va tekshirish |
| `src/excel.js` | Excel hisobot |
| `src/ui.js` | Menyular, sana formati, umumiy yordamchilar |

## 1. O'rnatish (Ubuntu server)

```bash
# Node.js 22 yoki undan yangi LTS (masalan, nvm orqali)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install --lts

# PostgreSQL
sudo apt update
sudo apt install -y postgresql
```

### Bazani yaratish

`KUCHLI_PAROL` o'rniga o'z parolingizni yozing (`@ : / # ?` belgilarisiz).

```bash
sudo -u postgres psql -c "CREATE USER testbot WITH PASSWORD 'KUCHLI_PAROL';"
sudo -u postgres psql -c "CREATE DATABASE testbot OWNER testbot ENCODING 'UTF8' TEMPLATE template0;"
```

Jadvallar bot birinchi marta ishga tushganda avtomatik yaratiladi.

### Loyihani sozlash

```bash
cd test-bot
npm install --omit=dev
cp .env.example .env
nano .env
chmod 600 .env
```

`.env` qiymatlari:

- `BOT_TOKEN` — [@BotFather](https://t.me/BotFather) bergan token
- `ADMIN_IDS` — adminlarning Telegram ID raqamlari, vergul bilan
- `DATABASE_URL` — `postgresql://testbot:KUCHLI_PAROL@localhost:5432/testbot`

## 2. Ishga tushirish

```bash
npm start
```

`Bot ishga tushdi: @...` yozuvi chiqsa, hammasi tayyor. To'xtatish: `Ctrl+C`.

## 3. Serverda pm2 bilan

```bash
npm install -g pm2
pm2 start src/index.js --name test-bot
pm2 save
pm2 startup          # ekranda chiqqan buyruqni nusxalab bajaring
```

| Amal | Buyruq |
|---|---|
| Holat | `pm2 status` |
| Loglar | `pm2 logs test-bot` |
| Qayta ishga tushirish | `pm2 restart test-bot` |
| To'xtatish | `pm2 stop test-bot` |

**Muhim:** bot faqat **bitta nusxada** ishlashi kerak. `pm2 -i` (cluster rejimi) ishlatmang va
bitta tokenni ikki joyda ishga tushirmang.

## 4. Birinchi sozlash

1. Admin botga `/start` yuboradi.
2. **👥 Guruhlar → ➕ Guruh qo'shish** orqali guruhlar kiritiladi.
3. O'qituvchi botga `/start` yuborib, ism-familiyasini yozadi (guruh tanlashi shart emas).
4. Admin **🔍 Foydalanuvchilar** orqali uni topib, o'qituvchi rolini beradi.
5. **➕ Test joylash**: fan → test nomi → `.txt` fayl → tasdiqlash → guruhlar → boshlanish →
   tugash → davomiylik → savollar soni → saqlash.

## 5. Test fayli formati

UTF-8 kodlashidagi `.txt` fayl. Namuna: `namuna_test.txt` (botda **📄 Namuna fayl** tugmasi).

```
Savol matni
====
#to'g'ri variant
====
noto'g'ri variant
+++++
Keyingi savol
====
...
```

- Har bir savolda 2–6 ta variant, aynan bittasi `#` bilan belgilanadi.
- Variantlar `====` bilan, savollar `+++++` bilan ajratiladi.
- Fayl hajmi 1 MB gacha, savollar 1000 tagacha.
- Variant boshidagi birinchi `#` belgisi to'g'ri javob deb olinadi. Noto'g'ri variant `#` bilan boshlanmasin.

## 6. Tanlangan sodda yechimlar

| Masala | Yechim |
|---|---|
| Guruhni almashtirish | Talaba guruhni bir marta tanlaydi. Xato bo'lsa, admin foydalanuvchini "Qayta ro'yxatdan o'tkazadi". |
| Qolgan vaqt | Har bir savol chiqqan paytdagi vaqt ko'rsatiladi (har soniyada yangilanmaydi). |
| Testni to'xtatish | Ishlayotganlarning testi shu zahoti yakunlanadi. |
| Sozlamalarni o'zgartirish | Faqat admin. Davomiylik va tugash vaqti ishlayotganlarga ham ta'sir qiladi; savollar soni faqat yangi urinishlarga. To'xtatilgan test qayta ochiladi, lekin yakunlangan urinishlar qayta ochilmaydi. |
| Testni o'chirish | Natijalari bilan butunlay o'chadi (avval tasdiq so'raladi). |
| Guruhni o'chirish | Eski natijalar guruh nomi bilan saqlanadi. |
| Cheklangan talaba | Hech narsa qila olmaydi. Boshlangan testining vaqti davom etadi va o'zi yopiladi. |
| Natijalar | Faqat yakunlangan urinishlar ko'rsatiladi. |
| Admin va o'qituvchi | Test ishlamaydi. Sinash uchun alohida talaba akkauntidan foydalaning. |
| Qo'shimcha paketlar | `@grammyjs/runner` (ko'p talaba bir vaqtda ishlashi uchun) va `@grammyjs/auto-retry` (Telegram limiti uchun) — grammY ning rasmiy plaginlari. |

## 7. Zaxira nusxa

```bash
pg_dump "postgresql://testbot:KUCHLI_PAROL@localhost:5432/testbot" > zaxira_$(date +%F).sql
```

Tiklash (bo'sh bazaga): `psql "postgresql://..." < zaxira_2026-01-01.sql`

## 8. Muammolar

| Xabar | Sababi |
|---|---|
| `401: Unauthorized` | `BOT_TOKEN` noto'g'ri |
| `409: Conflict` | Bot boshqa joyda ham ishlab turibdi |
| `password authentication failed` | `DATABASE_URL` dagi login yoki parol noto'g'ri |
| `ECONNREFUSED ...5432` | PostgreSQL ishlamayapti: `sudo systemctl start postgresql` |
