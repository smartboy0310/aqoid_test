import * as z from 'zod';

const SETTINGS_RE =
  /vaqt\s*\(daqiqa\)\s*:\s*(\d+)[\s\S]*urinishlar soni\s*:\s*(\d+)[\s\S]*o'tish bali\s*\(%\)\s*:\s*(\d+(?:\.\d+)?)[\s\S]*aralashtirish\s*:\s*(ha|yo'q)/i;

export const testSettingsSchema = z.string().transform((val, ctx) => {
  const m = val.match(SETTINGS_RE);
  if (!m) {
    ctx.addIssue({ code: 'custom', message: "Format noto'g'ri. Namunaga qarang." });
    return z.NEVER;
  }
  const minutes = Number(m[1]);
  const attempts = Number(m[2]);
  const passScore = Number(m[3]);
  const shuffle = m[4].toLowerCase() === 'ha';

  if (minutes < 1 || minutes > 300) {
    ctx.addIssue({ code: 'custom', message: "Vaqt 1–300 daqiqa oralig'ida bo'lishi kerak" });
    return z.NEVER;
  }
  if (attempts < 1 || attempts > 10) {
    ctx.addIssue({ code: 'custom', message: "Urinishlar soni 1–10 oralig'ida bo'lishi kerak" });
    return z.NEVER;
  }
  if (passScore < 0 || passScore > 100) {
    ctx.addIssue({ code: 'custom', message: "O'tish bali 0–100 oralig'ida bo'lishi kerak" });
    return z.NEVER;
  }

  return {
    timeLimitSec: minutes * 60,
    maxAttempts: attempts,
    passScore,
    shuffleQuestions: shuffle,
    shuffleOptions: shuffle,
  };
});

export const scheduleSchema = z.string().transform((val, ctx) => {
  const trimmed = val.trim().toLowerCase();
  if (trimmed === "yo'q" || trimmed === 'yoq') return { opensAt: null, closesAt: null };

  const openM = val.match(/ochilish\s*:\s*([\d-]+\s+[\d:]+)/i);
  const closeM = val.match(/yopilish\s*:\s*([\d-]+\s+[\d:]+)/i);
  if (!openM || !closeM) {
    ctx.addIssue({ code: 'custom', message: "Format noto'g'ri yoki \"yo'q\" deb yozing." });
    return z.NEVER;
  }
  const opensAt = new Date(openM[1].replace(' ', 'T'));
  const closesAt = new Date(closeM[1].replace(' ', 'T'));
  if (isNaN(opensAt.getTime()) || isNaN(closesAt.getTime())) {
    ctx.addIssue({ code: 'custom', message: "Sana formati noto'g'ri" });
    return z.NEVER;
  }
  if (closesAt <= opensAt) {
    ctx.addIssue({ code: 'custom', message: "Yopilish sanasi ochilishdan keyin bo'lishi kerak" });
    return z.NEVER;
  }
  return { opensAt, closesAt };
});
