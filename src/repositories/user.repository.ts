import type { Role } from '@prisma/client';
import { prisma } from '../db/prisma.js';

export const userRepository = {
  findByTelegramId(telegramId: bigint) {
    return prisma.user.findUnique({ where: { telegramId } });
  },
  findById(id: number) {
    return prisma.user.findUnique({ where: { id } });
  },
  create(data: { telegramId: bigint; fullName: string; role: Role; groupId: number | null }) {
    return prisma.user.create({ data });
  },
  searchByName(query: string) {
    return prisma.user.findMany({
      where: { fullName: { contains: query, mode: 'insensitive' } },
      take: 10,
      orderBy: { fullName: 'asc' },
    });
  },
  updateRole(id: number, role: Role) {
    return prisma.user.update({ where: { id }, data: { role } });
  },
  setBlocked(id: number, isBlocked: boolean) {
    return prisma.user.update({ where: { id }, data: { isBlocked } });
  },
  countForBroadcast(target: 'ALL' | 'STUDENT' | 'TEACHER') {
    return prisma.user.count({
      where: target === 'ALL' ? { isBlocked: false } : { role: target, isBlocked: false },
    });
  },
  findForBroadcast(target: 'ALL' | 'STUDENT' | 'TEACHER') {
    return prisma.user.findMany({
      where: target === 'ALL' ? { isBlocked: false } : { role: target, isBlocked: false },
      select: { telegramId: true },
    });
  },
};
