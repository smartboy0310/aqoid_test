const QUESTION_SEPARATOR = /^\+{5,}$/;
const OPTION_SEPARATOR = /^={4,}$/;
const BROKEN_SEPARATOR = /^(\+{3,}|={3,})$/;

const MAX_QUESTIONS = 1000;
// Telegram xabari 4096 belgidan oshmasligi kerak (sarlavha uchun joy qoldiriladi)
const MAX_QUESTION_LENGTH = 3800;

// Qatorlarni ajratkich bo'yicha bo'laklarga bo'ladi
function split(lines, separator) {
  const parts = [[]];
  for (const line of lines) {
    if (separator.test(line.trim())) parts.push([]);
    else parts.at(-1).push(line);
  }
  return parts;
}

// Matn -> { questions: [{ text, options, correct }], errors: [string] }
export function parseTest(content) {
  const lines = content.replace(/^﻿/, '').split(/\r\n|\r|\n/);
  const blocks = split(lines, QUESTION_SEPARATOR).filter((block) => block.some((line) => line.trim()));
  const questions = [];
  const errors = [];

  if (blocks.length === 0) return { questions, errors: ["Faylda birorta ham savol yo'q."] };
  if (blocks.length > MAX_QUESTIONS) {
    return { questions, errors: [`Savollar soni ${MAX_QUESTIONS} tadan oshmasligi kerak.`] };
  }

  blocks.forEach((block, index) => {
    const [text, ...rawOptions] = split(block, OPTION_SEPARATOR).map((part) => part.join('\n').trim());
    const problems = [];
    const options = [];
    const correct = [];

    rawOptions.forEach((raw, optionIndex) => {
      const isCorrect = raw.startsWith('#');
      const option = isCorrect ? raw.slice(1).trim() : raw;
      if (isCorrect) correct.push(optionIndex);
      if (!option) problems.push(`${optionIndex + 1}-variant bo'sh`);
      options.push(option);
    });

    if (!text) problems.push("savol matni yo'q");
    if (block.some((line) => BROKEN_SEPARATOR.test(line.trim()) && !OPTION_SEPARATOR.test(line.trim()))) {
      problems.push("noto'g'ri ajratkich bor (variantlar orasida ====, savollar orasida +++++ bo'lishi kerak)");
    }
    if (options.length < 2 || options.length > 6) {
      problems.push(`variantlar soni ${options.length} ta (2 tadan 6 tagacha bo'lishi kerak)`);
    }
    if (correct.length === 0) problems.push("to'g'ri javob # bilan belgilanmagan");
    if (correct.length > 1) problems.push(`${correct.length} ta to'g'ri javob belgilangan (faqat bitta bo'lishi kerak)`);
    if (text.length + options.join('').length > MAX_QUESTION_LENGTH) {
      problems.push('savol va variantlar juda uzun');
    }

    if (problems.length > 0) {
      const preview = (text.split('\n')[0] || '').slice(0, 50);
      errors.push(`${index + 1}-savol${preview ? ` («${preview}»)` : ''}: ${problems.join('; ')}.`);
    } else {
      questions.push({ text, options, correct: correct[0] });
    }
  });

  return { questions, errors };
}
