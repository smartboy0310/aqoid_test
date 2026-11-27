import { Role } from '@prisma/client';
import { userRepository } from '../repositories/user.repository.js';
import { env } from '../config/env.js';

export const authService = {
  async registerStudent(params: { telegramId: number; fullName: string; groupId: number }) {
    const isSuperAdmin = params.telegramId === env.SUPER_ADMIN_TELEGRAM_ID;
    const role: Role = isSuperAdmin ? Role.ADMIN : Role.STUDENT;

    return userRepository.create({
      telegramId: BigInt(params.telegramId),
      fullName: params.fullName,
      role,
      groupId: isSuperAdmin ? null : params.groupId,
    });
  },
};
