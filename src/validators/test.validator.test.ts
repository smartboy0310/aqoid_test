import { describe, it, expect } from 'vitest';
import { testSettingsSchema, scheduleSchema } from './test.validator.js';

describe('testSettingsSchema', () => {
  it("to'g'ri formatni qabul qiladi", () => {
    const result = testSettingsSchema.safeParse(
      "Vaqt (daqiqa): 30\nUrinishlar soni: 2\nO'tish bali (%): 60\nAralashtirish: ha",
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        timeLimitSec: 1800,
        maxAttempts: 2,
        passScore: 60,
        shuffleQuestions: true,
        shuffleOptions: true,
      });
    }
  });

  it('300 daqiqadan ortiq vaqtni rad etadi', () => {
    const input = "Vaqt (daqiqa): 500\nUrinishlar soni: 1\nO'tish bali (%): 60\nAralashtirish: yo'q";
    expect(testSettingsSchema.safeParse(input).success).toBe(false);
  });
});

describe('scheduleSchema', () => {
  it('"yo\'q" ni muddatsiz deb talqin qiladi', () => {
    const result = scheduleSchema.safeParse("yo'q");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual({ opensAt: null, closesAt: null });
  });

  it("yopilish ochilishdan oldin bo'lsa rad etadi", () => {
    const input = 'Ochilish: 2026-01-15 09:00\nYopilish: 2026-01-10 23:59';
    expect(scheduleSchema.safeParse(input).success).toBe(false);
  });
});
