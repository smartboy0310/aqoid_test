import { prisma } from '../db/prisma.js';
import type { AppWizardSession } from '../types/context.js';
import type { ParsedQuestion } from '../validators/question.validator.js';

export const testService = {
  async createTestWithGroups(params: {
    title: string;
    subjectId: number;
    authorId: number;
    timeLimitSec: number;
    maxAttempts: number;
    passScore: number;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    opensAt: Date | null;
    closesAt: Date | null;
    groupIds: number[];
  }) {
    return prisma.$transaction(async (tx) => {
      const test = await tx.test.create({
        data: {
          title: params.title,
          subjectId: params.subjectId,
          authorId: params.authorId,
          timeLimitSec: params.timeLimitSec,
          maxAttempts: params.maxAttempts,
          passScore: params.passScore,
          shuffleQuestions: params.shuffleQuestions,
          shuffleOptions: params.shuffleOptions,
          opensAt: params.opensAt,
          closesAt: params.closesAt,
        },
      });
      if (params.groupIds.length) {
        await tx.testGroup.createMany({
          data: params.groupIds.map((groupId) => ({ testId: test.id, groupId })),
        });
      }
      return test;
    });
  },

  async addQuestions(testId: number, questions: ParsedQuestion[]) {
    const startOrder = await prisma.question.count({ where: { testId } });
    return prisma.$transaction(
      questions.map((q, i) =>
        prisma.question.create({
          data: {
            testId,
            text: q.text,
            order: startOrder + i + 1,
            options: {
              create: q.options.map((o, j) => ({ text: o.text, isCorrect: o.isCorrect, order: j + 1 })),
            },
          },
        }),
      ),
    );
  },

  countQuestions(testId: number) {
    return prisma.question.count({ where: { testId } });
  },

  publishTest(testId: number) {
    return prisma.test.update({ where: { id: testId }, data: { status: 'PUBLISHED' } });
  },

  buildSummary(s: AppWizardSession) {
    return (
      `Test ma'lumotlarini tekshiring:\n\n` +
      `Nomi: ${s.title}\n` +
      `Vaqt: ${s.settings!.timeLimitSec / 60} daqiqa\n` +
      `Urinishlar: ${s.settings!.maxAttempts}\n` +
      `O'tish bali: ${s.settings!.passScore}%\n` +
      `Aralashtirish: ${s.settings!.shuffleQuestions ? 'ha' : "yo'q"}\n` +
      `Ochilish: ${s.schedule!.opensAt ? s.schedule!.opensAt.toLocaleString('uz-UZ') : 'hoziroq'}\n` +
      `Yopilish: ${s.schedule!.closesAt ? s.schedule!.closesAt.toLocaleString('uz-UZ') : 'muddatsiz'}\n` +
      `Guruhlar soni: ${s.selectedGroupIds!.length}\n\nTasdiqlaysizmi?`
    );
  },
};
