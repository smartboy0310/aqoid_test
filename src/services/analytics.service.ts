import { prisma } from '../db/prisma.js';
import { cronbachAlpha, difficultyIndex, discriminationIndex } from '../utils/statistics.js';

export interface ItemAnalysis {
  questionId: number;
  text: string;
  totalAnswered: number;
  correctCount: number;
  difficultyIndex: number;
  discriminationIndex: number;
  distractors: { optionText: string; isCorrect: boolean; pickedCount: number; pickedPercent: number }[];
}

export const analyticsService = {
  async getTestItemAnalysis(testId: number): Promise<ItemAnalysis[]> {
    const questions = await prisma.question.findMany({
      where: { testId },
      orderBy: { order: 'asc' },
      include: { options: true, answers: { include: { attempt: true } } },
    });

    const attempts = await prisma.attempt.findMany({
      where: { testId, status: { in: ['COMPLETED', 'EXPIRED'] } },
      select: { id: true, score: true },
    });
    const sortedByScore = [...attempts].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const groupSize = Math.max(1, Math.round(sortedByScore.length * 0.27));
    const upperIds = new Set(sortedByScore.slice(0, groupSize).map((a) => a.id));
    const lowerIds = new Set(sortedByScore.slice(-groupSize).map((a) => a.id));

    return questions.map((q) => {
      const answered = q.answers.filter((a) => a.attempt.status !== 'IN_PROGRESS');
      const correctCount = answered.filter((a) => a.isCorrect).length;

      const upperCorrect = answered.filter((a) => upperIds.has(a.attemptId) && a.isCorrect).length;
      const lowerCorrect = answered.filter((a) => lowerIds.has(a.attemptId) && a.isCorrect).length;

      const distractors = q.options.map((o) => {
        const pickedCount = answered.filter((a) => a.selectedOptionId === o.id).length;
        return {
          optionText: o.text,
          isCorrect: o.isCorrect,
          pickedCount,
          pickedPercent: answered.length ? Math.round((pickedCount / answered.length) * 1000) / 10 : 0,
        };
      });

      return {
        questionId: q.id,
        text: q.text,
        totalAnswered: answered.length,
        correctCount,
        difficultyIndex: difficultyIndex(correctCount, answered.length),
        discriminationIndex: discriminationIndex(upperCorrect, lowerCorrect, groupSize),
        distractors,
      };
    });
  },

  async getCronbachAlpha(testId: number): Promise<number | null> {
    const questions = await prisma.question.findMany({ where: { testId }, select: { id: true } });
    if (questions.length < 2) return null;

    const attempts = await prisma.attempt.findMany({
      where: { testId, status: { in: ['COMPLETED', 'EXPIRED'] } },
      include: { answers: true },
    });
    if (attempts.length < 2) return null;

    const itemScores: number[][] = questions.map((q) =>
      attempts.map((a) => (a.answers.find((ans) => ans.questionId === q.id)?.isCorrect ? 1 : 0)),
    );

    return cronbachAlpha(itemScores);
  },

  async getHardestEasiest(testId: number, limit = 5) {
    const items = await this.getTestItemAnalysis(testId);
    const answered = items.filter((i) => i.totalAnswered > 0);
    const sorted = [...answered].sort((a, b) => a.difficultyIndex - b.difficultyIndex);
    return { hardest: sorted.slice(0, limit), easiest: sorted.slice(-limit).reverse() };
  },

  async getStudentAnalytics(userId: number) {
    const attempts = await prisma.attempt.findMany({
      where: { userId, status: { in: ['COMPLETED', 'EXPIRED'] } },
      orderBy: { finishedAt: 'asc' },
      include: { test: { include: { subject: true } } },
    });

    const avgScore = attempts.length
      ? Math.round((attempts.reduce((s, a) => s + (a.score ?? 0), 0) / attempts.length) * 100) / 100
      : null;

    const bySubject = new Map<string, number[]>();
    for (const a of attempts) {
      const name = a.test.subject.name;
      if (!bySubject.has(name)) bySubject.set(name, []);
      bySubject.get(name)!.push(a.score ?? 0);
    }
    const subjectAverages = [...bySubject.entries()]
      .map(([name, scores]) => ({
        subject: name,
        avg: Math.round((scores.reduce((s, x) => s + x, 0) / scores.length) * 100) / 100,
      }))
      .sort((a, b) => b.avg - a.avg);

    return {
      avgScore,
      trend: attempts.map((a) => ({ date: a.finishedAt, score: a.score, test: a.test.title })),
      strongSubjects: subjectAverages.slice(0, 3),
      weakSubjects: subjectAverages.slice(-3).reverse(),
    };
  },

  async getGroupAnalytics(testId: number) {
    const attempts = await prisma.attempt.findMany({
      where: { testId, status: { in: ['COMPLETED', 'EXPIRED'] } },
      include: { user: { include: { group: true } } },
    });

    const byGroup = new Map<string, number[]>();
    for (const a of attempts) {
      const name = a.user.group?.name ?? 'Guruhsiz';
      if (!byGroup.has(name)) byGroup.set(name, []);
      byGroup.get(name)!.push(a.score ?? 0);
    }

    return [...byGroup.entries()]
      .map(([group, scores]) => ({
        group,
        count: scores.length,
        avg: Math.round((scores.reduce((s, x) => s + x, 0) / scores.length) * 100) / 100,
        min: Math.min(...scores),
        max: Math.max(...scores),
      }))
      .sort((a, b) => b.avg - a.avg);
  },
};
