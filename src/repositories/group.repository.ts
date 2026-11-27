import { prisma } from '../db/prisma.js';

export const groupRepository = {
  findAll() {
    return prisma.group.findMany({ orderBy: [{ facultyId: 'asc' }, { name: 'asc' }] });
  },
  findByFacultyAndCourse(facultyId: number, course: number) {
    return prisma.group.findMany({ where: { facultyId, course }, orderBy: { name: 'asc' } });
  },
  findById(id: number) {
    return prisma.group.findUnique({ where: { id }, include: { faculty: true } });
  },
};
