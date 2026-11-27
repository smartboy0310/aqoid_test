import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '../../src/db/prisma.js';
import { authService } from '../../src/services/auth.service.js';
import { env } from '../../src/config/env.js';
import { resetDb, seedBasicFixtures } from '../helpers/db.js';

describe('authService.registerStudent', () => {
  beforeEach(resetDb);
  afterAll(() => prisma.$disconnect());

  it("oddiy foydalanuvchini STUDENT sifatida ro'yxatdan o'tkazadi", async () => {
    const { group } = await seedBasicFixtures();
    const user = await authService.registerStudent({
      telegramId: 111222333,
      fullName: 'Aziz Karimov',
      groupId: group.id,
    });
    expect(user.role).toBe('STUDENT');
    expect(user.groupId).toBe(group.id);
  });

  it("SUPER_ADMIN_TELEGRAM_ID ni ADMIN sifatida ro'yxatdan o'tkazadi", async () => {
    const { group } = await seedBasicFixtures();
    const user = await authService.registerStudent({
      telegramId: env.SUPER_ADMIN_TELEGRAM_ID,
      fullName: 'Bosh Admin',
      groupId: group.id,
    });
    expect(user.role).toBe('ADMIN');
    expect(user.groupId).toBeNull();
  });
});
