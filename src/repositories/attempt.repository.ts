import { prisma } from '../db/prisma.js';
import type { AttemptStatus } from '@prisma/client';

export const attemptRepository = {
  findActive(userId: number, testId: number) {
    return prisma.attempt.findFirst({ where: { userId, testId, status: 'IN_PROGRESS' } });
  },
  countFinished(userId: number, testId: number) {
    return prisma.attempt.count({ where: { userId, testId, status: { in: ['COMPLETED', 'EXPIRED'] } } });
  },
  create(data: { userId: number; testId: number; questionOrder: number[] }) {
    return prisma.attempt.create({ data });
  },
  findById(id: number) {
    return prisma.attempt.findUnique({ where: { id }, include: { test: true, user: true } });
  },
  finish(
    id: number,
    status: Extract<AttemptStatus, 'COMPLETED' | 'EXPIRED'>,
    score: number,
    correctCount: number,
  ) {
    return prisma.attempt.updateMany({
      where: { id, status: 'IN_PROGRESS' },
      data: { status, finishedAt: new Date(), score, correctCount },
    });
  },
  history(userId: number, limit = 10) {
    return prisma.attempt.findMany({
      where: { userId, status: { in: ['COMPLETED', 'EXPIRED'] } },
      orderBy: { finishedAt: 'desc' },
      take: limit,
      include: { test: true },
    });
  },
};
