import { prisma } from '../db/prisma.js';

export const subjectRepository = {
  findAll() {
    return prisma.subject.findMany({ orderBy: { name: 'asc' } });
  },
  async findOrCreate(name: string) {
    const existing = await prisma.subject.findUnique({ where: { name } });
    return existing ?? prisma.subject.create({ data: { name } });
  },
};
