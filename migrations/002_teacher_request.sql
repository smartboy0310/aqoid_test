-- O'qituvchi roli so'rovi uchun ustunlar. Qayta ishga tushirilsa ham xavfsiz.
-- Mavjud foydalanuvchi, test va natijalar o'zgarmaydi.
BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS teacher_request TEXT
  CHECK (teacher_request IN ('pending', 'rejected'));

ALTER TABLE users ADD COLUMN IF NOT EXISTS teacher_request_no INT NOT NULL DEFAULT 0;

COMMIT;
