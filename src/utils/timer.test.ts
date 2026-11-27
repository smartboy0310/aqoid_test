import { describe, it, expect } from 'vitest';
import { formatRemaining } from './timer.js';

describe('formatRemaining', () => {
  it('0 yoki manfiy qiymat uchun "0 soniya" qaytaradi', () => {
    expect(formatRemaining(0)).toBe('0 soniya');
    expect(formatRemaining(-5)).toBe('0 soniya');
  });

  it("1 daqiqadan kam vaqtni faqat soniyada ko'rsatadi", () => {
    expect(formatRemaining(45)).toBe('45 soniya');
  });

  it("daqiqa va soniyani birga ko'rsatadi", () => {
    expect(formatRemaining(125)).toBe('2 daqiqa 5 soniya');
  });
});
