import { prisma } from '../db/prisma.js';
import { userRepository } from '../repositories/user.repository.js';

export const adminService = {
  async searchUsers(query: string) {
    const trimmed = query.trim();
    if (/^\d+$/.test(trimmed)) {
      const user = await userRepository.findByTelegramId(BigInt(trimmed));
      return user ? [user] : [];
    }
    return userRepository.searchByName(trimmed);
  },
  getUserById(id: number) {
    return userRepository.findById(id);
  },
  promoteToTeacher(userId: number) {
    return userRepository.updateRole(userId, 'TEACHER');
  },
  demoteToStudent(userId: number) {
    return userRepository.updateRole(userId, 'STUDENT');
  },
  blockUser(userId: number) {
    return userRepository.setBlocked(userId, true);
  },
  unblockUser(userId: number) {
    return userRepository.setBlocked(userId, false);
  },

  async getDashboardStats() {
    const [students, teachers, admins, faculties, groups, subjects, tests, publishedTests, attempts, avgScoreAgg] =
      await Promise.all([
        prisma.user.count({ where: { role: 'STUDENT' } }),
        prisma.user.count({ where: { role: 'TEACHER' } }),
        prisma.user.count({ where: { role: 'ADMIN' } }),
        prisma.faculty.count(),
        prisma.group.count(),
        prisma.subject.count(),
        prisma.test.count(),
        prisma.test.count({ where: { status: 'PUBLISHED' } }),
        prisma.attempt.count({ where: { status: { in: ['COMPLETED', 'EXPIRED'] } } }),
        prisma.attempt.aggregate({
          _avg: { score: true },
          where: { status: { in: ['COMPLETED', 'EXPIRED'] } },
        }),
      ]);

    return {
      students,
      teachers,
      admins,
      faculties,
      groups,
      subjects,
      tests,
      publishedTests,
      attempts,
      avgScore: avgScoreAgg._avg.score !== null ? Math.round(avgScoreAgg._avg.score * 100) / 100 : null,
    };
  },
};
