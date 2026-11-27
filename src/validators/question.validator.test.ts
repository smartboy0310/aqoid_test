import { describe, it, expect } from 'vitest';
import { parsedQuestionSchema } from './question.validator.js';

describe('parsedQuestionSchema', () => {
  it("aynan bitta to'g'ri javob bilan qabul qiladi", () => {
    expect(
      parsedQuestionSchema.safeParse({
        text: 'Savol matni?',
        options: [
          { text: 'A', isCorrect: true },
          { text: 'B', isCorrect: false },
        ],
      }).success,
    ).toBe(true);
  });

  it("ikkita to'g'ri javobni rad etadi", () => {
    expect(
      parsedQuestionSchema.safeParse({
        text: 'Savol matni?',
        options: [
          { text: 'A', isCorrect: true },
          { text: 'B', isCorrect: true },
        ],
      }).success,
    ).toBe(false);
  });

  it('bitta variant bilan rad etadi', () => {
    expect(
      parsedQuestionSchema.safeParse({ text: 'Savol matni?', options: [{ text: 'A', isCorrect: true }] })
        .success,
    ).toBe(false);
  });
});
