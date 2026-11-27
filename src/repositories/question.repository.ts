import { prisma } from '../db/prisma.js';

export const questionRepository = {
  findByTest(testId: number) {
    return prisma.question.findMany({ where: { testId }, orderBy: { order: 'asc' } });
  },
  findByIdWithOptions(id: number) {
    return prisma.question.findUnique({ where: { id }, include: { options: true } });
  },
};
