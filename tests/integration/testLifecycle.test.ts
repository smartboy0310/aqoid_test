import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '../../src/db/prisma.js';
import { testService } from '../../src/services/test.service.js';
import { resetDb, seedBasicFixtures } from '../helpers/db.js';

describe("test yaratish, savol qo'shish, nashr qilish", () => {
  beforeEach(resetDb);
  afterAll(() => prisma.$disconnect());

  it("to'liq hayot siklini bajaradi", async () => {
    const { group, subject } = await seedBasicFixtures();
    const teacher = await prisma.user.create({
      data: { telegramId: 555n, fullName: "O'qituvchi Test", role: 'TEACHER' },
    });

    const test = await testService.createTestWithGroups({
      title: 'Sinov testi',
      subjectId: subject.id,
      authorId: teacher.id,
      timeLimitSec: 600,
      maxAttempts: 1,
      passScore: 60,
      shuffleQuestions: true,
      shuffleOptions: true,
      opensAt: null,
      closesAt: null,
      groupIds: [group.id],
    });
    expect(test.status).toBe('DRAFT');

    await testService.addQuestions(test.id, [
      {
        text: 'Savol 1?',
        options: [
          { text: "To'g'ri", isCorrect: true },
          { text: "Noto'g'ri", isCorrect: false },
        ],
      },
    ]);
    expect(await testService.countQuestions(test.id)).toBe(1);

    const published = await testService.publishTest(test.id);
    expect(published.status).toBe('PUBLISHED');

    const testGroups = await prisma.testGroup.findMany({ where: { testId: test.id } });
    expect(testGroups).toHaveLength(1);
  });
});
