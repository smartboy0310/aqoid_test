import { prisma } from '../db/prisma.js';
import { attemptRepository } from '../repositories/attempt.repository.js';
import { answerRepository } from '../repositories/answer.repository.js';
import { questionRepository } from '../repositories/question.repository.js';
import { testRepository } from '../repositories/test.repository.js';
import { withLock } from '../utils/lock.js';
import { randomShuffle, seededShuffle } from '../utils/shuffle.js';
import { formatRemaining } from '../utils/timer.js';
import { scheduleAttemptTimeout, cancelAttemptTimeout } from '../queues/attemptTimeout.queue.js';
import { logger } from '../utils/logger.js';

export class AttemptError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

export const attemptService = {
  async startAttempt(userId: number, testId: number, groupId: number | null) {
    return withLock(`lock:attempt:${userId}:${testId}`, 5000, async () => {
      const existing = await attemptRepository.findActive(userId, testId);
      if (existing) return { attempt: existing, resumed: true };

      const test = await testRepository.findById(testId);
      if (!test) throw new AttemptError('NOT_FOUND', 'Test topilmadi');
      if (test.status !== 'PUBLISHED') throw new AttemptError('NOT_PUBLISHED', 'Bu test hozircha mavjud emas');

      const now = new Date();
      if (test.opensAt && test.opensAt > now) throw new AttemptError('NOT_OPEN', 'Test hali ochilmagan');
      if (test.closesAt && test.closesAt < now) throw new AttemptError('CLOSED', 'Test muddati tugagan');

      const authorized = groupId
        ? await prisma.testGroup.findUnique({ where: { testId_groupId: { testId, groupId } } })
        : null;
      if (!authorized) throw new AttemptError('FORBIDDEN', "Bu test sizning guruhingiz uchun mo'ljallanmagan");

      const usedAttempts = await attemptRepository.countFinished(userId, testId);
      if (usedAttempts >= test.maxAttempts) {
        throw new AttemptError('NO_ATTEMPTS_LEFT', 'Urinishlar soni tugagan');
      }

      const questions = await questionRepository.findByTest(testId);
      if (questions.length === 0) throw new AttemptError('EMPTY', "Testda savollar yo'q");

      const order = (test.shuffleQuestions ? randomShuffle(questions) : questions).map((q) => q.id);
      const attempt = await attemptRepository.create({ userId, testId, questionOrder: order });

      await scheduleAttemptTimeout(attempt.id, test.timeLimitSec * 1000);

      return { attempt, resumed: false };
    });
  },

  async getQuestionView(attemptId: number) {
    const attempt = await attemptRepository.findById(attemptId);
    if (!attempt || attempt.status !== 'IN_PROGRESS') return null;

    const elapsedSec = (Date.now() - attempt.startedAt.getTime()) / 1000;
    const remainingSec = attempt.test.timeLimitSec - elapsedSec;
    if (remainingSec <= 0) {
      await this.finishExpiredAttempt(attemptId);
      return { expired: true as const };
    }

    const order = attempt.questionOrder as number[];
    const answeredCount = await answerRepository.countForAttempt(attemptId);
    if (answeredCount >= order.length) return null;

    const questionId = order[answeredCount];
    const question = await questionRepository.findByIdWithOptions(questionId);
    if (!question) throw new AttemptError('NOT_FOUND', 'Savol topilmadi');

    const displayOptions = attempt.test.shuffleOptions
      ? seededShuffle(question.options, `${attemptId}:${questionId}`)
      : [...question.options].sort((a, b) => a.order - b.order);

    return {
      expired: false as const,
      attemptId,
      questionId,
      index: answeredCount,
      total: order.length,
      text: question.text,
      options: displayOptions,
      remainingLabel: formatRemaining(remainingSec),
    };
  },

  async submitAnswer(attemptId: number, questionId: number, optionId: number) {
    const attempt = await attemptRepository.findById(attemptId);
    if (!attempt || attempt.status !== 'IN_PROGRESS') {
      return { status: 'ALREADY_FINISHED' as const };
    }

    const elapsedSec = (Date.now() - attempt.startedAt.getTime()) / 1000;
    if (elapsedSec > attempt.test.timeLimitSec) {
      const result = await this.finishExpiredAttempt(attemptId);
      return { status: 'EXPIRED' as const, result };
    }

    const order = attempt.questionOrder as number[];
    const answeredCount = await answerRepository.countForAttempt(attemptId);
    const expectedQuestionId = order[answeredCount];

    if (expectedQuestionId !== questionId) {
      return { status: 'STALE' as const };
    }

    const option = await prisma.option.findUnique({ where: { id: optionId } });
    if (!option || option.questionId !== questionId) {
      return { status: 'STALE' as const };
    }

    try {
      await answerRepository.create({
        attemptId,
        questionId,
        selectedOptionId: optionId,
        isCorrect: option.isCorrect,
        timeSpentSec: Math.round(elapsedSec),
      });
    } catch (err) {
      logger.warn({ err, attemptId, questionId }, "Takroriy javob urinishi e'tiborsiz qoldirildi");
      return { status: 'STALE' as const };
    }

    if (answeredCount + 1 >= order.length) {
      const result = await this.finishCompletedAttempt(attemptId);
      return { status: 'FINISHED' as const, result };
    }

    return { status: 'NEXT' as const };
  },

  finishCompletedAttempt(attemptId: number) {
    return this._finish(attemptId, 'COMPLETED');
  },

  finishExpiredAttempt(attemptId: number) {
    return this._finish(attemptId, 'EXPIRED');
  },

  async _finish(attemptId: number, status: 'COMPLETED' | 'EXPIRED') {
    const attempt = await attemptRepository.findById(attemptId);
    if (!attempt) return null;

    const correctCount = await answerRepository.countCorrect(attemptId);
    const total = (attempt.questionOrder as number[]).length;
    const score = total > 0 ? Math.round((correctCount / total) * 10000) / 100 : 0;

    const updated = await attemptRepository.finish(attemptId, status, score, correctCount);
    if (updated.count === 0) return null;

    await cancelAttemptTimeout(attemptId);

    const passed = score >= attempt.test.passScore;
    return {
      telegramId: attempt.user.telegramId,
      score,
      correctCount,
      total,
      passed,
      testTitle: attempt.test.title,
      message:
        `"${attempt.test.title}" testi yakunlandi.\n\n` +
        `To'g'ri javoblar: ${correctCount}/${total}\n` +
        `Ball: ${score}%\n` +
        `Natija: ${passed ? "✅ O'tdingiz" : "❌ O'ta olmadingiz"} (o'tish bali: ${attempt.test.passScore}%)`,
    };
  },

  getWrongAnswersReview(attemptId: number) {
    return answerRepository.findWrongWithDetails(attemptId);
  },
};
