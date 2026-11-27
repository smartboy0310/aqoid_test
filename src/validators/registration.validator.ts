import * as z from 'zod';

export const fullNameSchema = z
  .string()
  .trim()
  .min(5, 'Ism juda qisqa')
  .max(100, 'Ism juda uzun')
  .regex(
    /^[A-Za-zА-Яа-яЁёʻʼ'’\s-]+$/u,
    "Faqat harflar, bo'sh joy va chiziqcha ishlatilishi mumkin",
  )
  .refine((val) => val.trim().split(/\s+/).length >= 2, {
    message: "Familiya va ismingizni to'liq kiriting",
  });
