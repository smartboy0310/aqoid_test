import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '../../src/db/prisma.js';
import { testService } from '../../src/services/test.service.js';
import { attemptService, AttemptError } from '../../src/services/attempt.service.js';
import { attemptTimeoutQueue } from '../../src/queues/attemptTimeout.queue.js';
import { resetDb, seedBasicFixtures } from '../helpers/db.js';

async function createPublishedTest(opts: {
  groupId: number;
  subjectId: number;
  authorId: number;
  maxAttempts?: number;
  closesAt?: Date | null;
}) {
  const test = await testService.createTestWithGroups({
    title: 'Urinish testi',
    subjectId: opts.subjectId,
    authorId: opts.authorId,
    timeLimitSec: 600,
    maxAttempts: opts.maxAttempts ?? 1,
    passScore: 50,
    shuffleQuestions: false,
    shuffleOptions: false,
    opensAt: null,
    closesAt: opts.closesAt ?? null,
    groupIds: [opts.groupId],
  });
  await testService.addQuestions(test.id, [
    {
      text: 'Q1?',
      options: [
        { text: "To'g'ri", isCorrect: true },
        { text: "Noto'g'ri", isCorrect: false },
      ],
    },
    {
      text: 'Q2?',
      options: [
        { text: "To'g'ri", isCorrect: true },
        { text: "Noto'g'ri", isCorrect: false },
      ],
    },
  ]);
  return testService.publishTest(test.id);
}

describe('attemptService', () => {
  beforeEach(resetDb);
  afterAll(async () => {
    await attemptTimeoutQueue.obliterate({ force: true });
    await prisma.$disconnect();
  });

  it('yangi urinish boshlaydi va savollar sonini saqlaydi', async () => {
    const { group, subject } = await seedBasicFixtures();
    const teacher = await prisma.user.create({ data: { telegramId: 1n, fullName: 'T', role: 'TEACHER' } });
    const student = await prisma.user.create({
      data: { telegramId: 2n, fullName: 'S', role: 'STUDENT', groupId: group.id },
    });
    const test = await createPublishedTest({ groupId: group.id, subjectId: subject.id, authorId: teacher.id });

    const { attempt, resumed } = await attemptService.startAttempt(student.id, test.id, group.id);
    expect(resumed).toBe(false);
    expect((attempt.questionOrder as number[]).length).toBe(2);
  });

  it('bitta foydalanuvchi ikkita urinishni bir vaqtda boshlay olmaydi', async () => {
    const { group, subject } = await seedBasicFixtures();
    const teacher = await prisma.user.create({ data: { telegramId: 3n, fullName: 'T', role: 'TEACHER' } });
    const student = await prisma.user.create({
      data: { telegramId: 4n, fullName: 'S', role: 'STUDENT', groupId: group.id },
    });
    const test = await createPublishedTest({ groupId: group.id, subjectId: subject.id, authorId: teacher.id });

    const first = await attemptService.startAttempt(student.id, test.id, group.id);
    const second = await attemptService.startAttempt(student.id, test.id, group.id);

    expect(second.resumed).toBe(true);
    expect(second.attempt.id).toBe(first.attempt.id);
    expect(await prisma.attempt.count({ where: { userId: student.id, testId: test.id } })).toBe(1);
  });

  it("boshqa guruh uchun mo'ljallangan testga ruxsat bermaydi", async () => {
    const { group, subject } = await seedBasicFixtures();
    const otherGroup = await prisma.group.create({
      data: { name: 'Boshqa', course: 1, facultyId: group.facultyId },
    });
    const teacher = await prisma.user.create({ data: { telegramId: 5n, fullName: 'T', role: 'TEACHER' } });
    const student = await prisma.user.create({
      data: { telegramId: 6n, fullName: 'S', role: 'STUDENT', groupId: otherGroup.id },
    });
    const test = await createPublishedTest({ groupId: group.id, subjectId: subject.id, authorId: teacher.id });

    await expect(attemptService.startAttempt(student.id, test.id, otherGroup.id)).rejects.toThrow(AttemptError);
  });

  it('muddati tugagan testga ruxsat bermaydi', async () => {
    const { group, subject } = await seedBasicFixtures();
    const teacher = await prisma.user.create({ data: { telegramId: 7n, fullName: 'T', role: 'TEACHER' } });
    const student = await prisma.user.create({
      data: { telegramId: 8n, fullName: 'S', role: 'STUDENT', groupId: group.id },
    });
    const test = await createPublishedTest({
      groupId: group.id,
      subjectId: subject.id,
      authorId: teacher.id,
      closesAt: new Date(Date.now() - 1000 * 60 * 60),
    });

    await expect(attemptService.startAttempt(student.id, test.id, group.id)).rejects.toThrow(AttemptError);
  });

  it('maxAttempts tugagandan keyin yangi urinishga ruxsat bermaydi', async () => {
    const { group, subject } = await seedBasicFixtures();
    const teacher = await prisma.user.create({ data: { telegramId: 9n, fullName: 'T', role: 'TEACHER' } });
    const student = await prisma.user.create({
      data: { telegramId: 10n, fullName: 'S', role: 'STUDENT', groupId: group.id },
    });
    const test = await createPublishedTest({
      groupId: group.id,
      subjectId: subject.id,
      authorId: teacher.id,
      maxAttempts: 1,
    });

    const { attempt } = await attemptService.startAttempt(student.id, test.id, group.id);
    await prisma.attempt.update({
      where: { id: attempt.id },
      data: { status: 'COMPLETED', finishedAt: new Date(), score: 100, correctCount: 2 },
    });

    await expect(attemptService.startAttempt(student.id, test.id, group.id)).rejects.toThrow(AttemptError);
  });

  it("javoblarni to'g'ri baholaydi va testni yakunlaydi", async () => {
    const { group, subject } = await seedBasicFixtures();
    const teacher = await prisma.user.create({ data: { telegramId: 11n, fullName: 'T', role: 'TEACHER' } });
    const student = await prisma.user.create({
      data: { telegramId: 12n, fullName: 'S', role: 'STUDENT', groupId: group.id },
    });
    const test = await createPublishedTest({ groupId: group.id, subjectId: subject.id, authorId: teacher.id });

    const { attempt } = await attemptService.startAttempt(student.id, test.id, group.id);

    const q1 = await attemptService.getQuestionView(attempt.id);
    if (!q1 || q1.expired) throw new Error('kutilmagan holat');
    const r1 = await attemptService.submitAnswer(
      attempt.id,
      q1.questionId,
      q1.options.find((o) => o.isCorrect)!.id,
    );
    expect(r1.status).toBe('NEXT');

    const q2 = await attemptService.getQuestionView(attempt.id);
    if (!q2 || q2.expired) throw new Error('kutilmagan holat');
    const r2 = await attemptService.submitAnswer(
      attempt.id,
      q2.questionId,
      q2.options.find((o) => !o.isCorrect)!.id,
    );

    expect(r2.status).toBe('FINISHED');
    if (r2.status === 'FINISHED' && r2.result) {
      expect(r2.result.correctCount).toBe(1);
      expect(r2.result.score).toBe(50);
    }
    expect((await prisma.attempt.findUnique({ where: { id: attempt.id } }))?.status).toBe('COMPLETED');
  });

  it('eskirgan (qayta) javobni rad etadi', async () => {
    const { group, subject } = await seedBasicFixtures();
    const teacher = await prisma.user.create({ data: { telegramId: 13n, fullName: 'T', role: 'TEACHER' } });
    const student = await prisma.user.create({
      data: { telegramId: 14n, fullName: 'S', role: 'STUDENT', groupId: group.id },
    });
    const test = await createPublishedTest({ groupId: group.id, subjectId: subject.id, authorId: teacher.id });

    const { attempt } = await attemptService.startAttempt(student.id, test.id, group.id);
    const q1 = await attemptService.getQuestionView(attempt.id);
    if (!q1 || q1.expired) throw new Error('kutilmagan holat');

    await attemptService.submitAnswer(attempt.id, q1.questionId, q1.options[0].id);
    const repeat = await attemptService.submitAnswer(attempt.id, q1.questionId, q1.options[0].id);
    expect(repeat.status).toBe('STALE');
  });
});
