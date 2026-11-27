import { prisma } from '../db/prisma.js';

export const testRepository = {
  findByAuthor(authorId: number) {
    return prisma.test.findMany({ where: { authorId }, orderBy: { createdAt: 'desc' } });
  },
  findAvailableForGroup(groupId: number) {
    const now = new Date();
    return prisma.test.findMany({
      where: {
        status: 'PUBLISHED',
        testGroups: { some: { groupId } },
        OR: [{ opensAt: null }, { opensAt: { lte: now } }],
        AND: [{ OR: [{ closesAt: null }, { closesAt: { gte: now } }] }],
      },
      orderBy: { createdAt: 'desc' },
    });
  },
  findById(id: number) {
    return prisma.test.findUnique({ where: { id } });
  },
};
