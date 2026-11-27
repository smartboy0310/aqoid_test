import { describe, it, expect } from 'vitest';
import { fullNameSchema } from './registration.validator.js';

describe('fullNameSchema', () => {
  it("to'g'ri F.I.Sh.ni qabul qiladi", () => {
    expect(fullNameSchema.safeParse('Aziz Karimov').success).toBe(true);
  });
  it("bitta so'zni rad etadi", () => {
    expect(fullNameSchema.safeParse('Aziz').success).toBe(false);
  });
  it('raqamlarni rad etadi', () => {
    expect(fullNameSchema.safeParse('Aziz123 Karimov').success).toBe(false);
  });
  it('kirill yozuvini qabul qiladi', () => {
    expect(fullNameSchema.safeParse('Азиз Каримов').success).toBe(true);
  });
});
