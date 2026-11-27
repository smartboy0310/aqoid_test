import { describe, it, expect } from 'vitest';
import { seededShuffle, randomShuffle } from './shuffle.js';

describe('seededShuffle', () => {
  it('bir xil seed bilan har doim bir xil natija beradi', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(seededShuffle(items, 'attempt-42:question-7')).toEqual(
      seededShuffle(items, 'attempt-42:question-7'),
    );
  });

  it('turli seed bilan odatda turli natija beradi', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(seededShuffle(items, 'seed-A')).not.toEqual(seededShuffle(items, 'seed-B'));
  });

  it("asl massivni o'zgartirmaydi", () => {
    const items = [1, 2, 3];
    const copy = [...items];
    seededShuffle(items, 'x');
    expect(items).toEqual(copy);
  });

  it('barcha elementlarni saqlab qoladi', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    expect(seededShuffle(items, 'test-seed').sort()).toEqual([...items].sort());
  });
});

describe('randomShuffle', () => {
  it('barcha elementlarni saqlab qoladi', () => {
    const items = [1, 2, 3, 4, 5];
    expect(randomShuffle(items).sort((a, b) => a - b)).toEqual(items);
  });
});
