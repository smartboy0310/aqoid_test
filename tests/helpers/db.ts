import { prisma } from '../../src/db/prisma.js';

/** Har bir testdan oldin barcha jadvallarni tozalaydi (FK tartibida) */
export async function resetDb() {
  await prisma.answer.deleteMany();
  await prisma.attempt.deleteMany();
  await prisma.option.deleteMany();
  await prisma.question.deleteMany();
  await prisma.testGroup.deleteMany();
  await prisma.test.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.user.deleteMany();
  await prisma.group.deleteMany();
  await prisma.faculty.deleteMany();
}

export async function seedBasicFixtures() {
  const faculty = await prisma.faculty.create({ data: { name: 'Test fakulteti' } });
  const group = await prisma.group.create({ data: { name: 'T-101', course: 1, facultyId: faculty.id } });
  const subject = await prisma.subject.create({ data: { name: 'Test fani' } });
  return { faculty, group, subject };
}
