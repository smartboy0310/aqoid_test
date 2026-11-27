import { Markup } from 'telegraf';

export const questionImportMenuKeyboard = () =>
  Markup.inlineKeyboard([
    [Markup.button.callback("✍️ Qo'lda kiritish", 'qi:manual')],
    [Markup.button.callback('📎 Fayldan import', 'qi:file')],
    [Markup.button.callback('✅ Tugatish va nashr qilish', 'qi:finish')],
  ]);

export const finishKeyboard = () =>
  Markup.inlineKeyboard([[Markup.button.callback('✅ Tugatish va nashr qilish', 'qi:finish')]]);
