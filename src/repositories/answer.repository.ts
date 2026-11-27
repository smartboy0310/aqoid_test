import { prisma } from '../db/prisma.js';

export const answerRepository = {
  countForAttempt(attemptId: number) {
    return prisma.answer.count({ where: { attemptId } });
  },
  countCorrect(attemptId: number) {
    return prisma.answer.count({ where: { attemptId, isCorrect: true } });
  },
  create(data: {
    attemptId: number;
    questionId: number;
    selectedOptionId: number;
    isCorrect: boolean;
    timeSpentSec: number;
  }) {
    return prisma.answer.create({ data: { ...data, answeredAt: new Date() } });
  },
  findWrongWithDetails(attemptId: number) {
    return prisma.answer.findMany({
      where: { attemptId, isCorrect: false },
      include: { question: { include: { options: true } }, selectedOption: true },
    });
  },
};
