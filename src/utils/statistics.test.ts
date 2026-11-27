import { describe, it, expect } from 'vitest';
import { variance, cronbachAlpha, difficultyIndex, discriminationIndex } from './statistics.js';

describe('variance', () => {
  it('bir xil qiymatlar uchun 0 qaytaradi', () => {
    expect(variance([5, 5, 5, 5])).toBe(0);
  });

  it('[1,1,0,0] uchun 0.25 qaytaradi', () => {
    expect(variance([1, 1, 0, 0])).toBeCloseTo(0.25, 5);
  });
});

describe('difficultyIndex', () => {
  it("to'g'ri hisoblaydi", () => {
    expect(difficultyIndex(7, 10)).toBe(0.7);
  });

  it("javob berganlar 0 bo'lsa 0 qaytaradi", () => {
    expect(difficultyIndex(0, 0)).toBe(0);
  });
});

describe('discriminationIndex', () => {
  it("yuqori guruh ko'proq to'g'ri javob berganda musbat qiymat qaytaradi", () => {
    expect(discriminationIndex(8, 3, 10)).toBeCloseTo(0.5, 5);
  });

  it("ikkala guruh bir xil natija ko'rsatsa 0 qaytaradi", () => {
    expect(discriminationIndex(5, 5, 10)).toBe(0);
  });

  it("guruh hajmi 0 bo'lsa 0 qaytaradi", () => {
    expect(discriminationIndex(0, 0, 0)).toBe(0);
  });
});

describe('cronbachAlpha', () => {
  it("3 ta savol, 4 ta talaba uchun qo'lda hisoblangan qiymatga mos keladi", () => {
    const itemScores = [
      [1, 1, 0, 0],
      [1, 0, 1, 0],
      [1, 1, 1, 0],
    ];
    expect(cronbachAlpha(itemScores)).toBeCloseTo(0.632, 3);
  });

  it('bitta savol bilan null qaytaradi (k < 2)', () => {
    expect(cronbachAlpha([[1, 0, 1]])).toBeNull();
  });

  it('barcha talabalar bir xil ball olsa null qaytaradi (umumiy dispersiya 0)', () => {
    expect(
      cronbachAlpha([
        [1, 1],
        [1, 1],
      ]),
    ).toBeNull();
  });
});
