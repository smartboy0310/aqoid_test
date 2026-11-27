import { prisma } from '../db/prisma.js';

export const facultyRepository = {
  findAll() {
    return prisma.faculty.findMany({ orderBy: { name: 'asc' } });
  },
};
