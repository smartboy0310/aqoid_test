import ExcelJS from 'exceljs';
import { prisma } from '../db/prisma.js';
import { analyticsService } from './analytics.service.js';

export const reportService = {
  async buildTestReport(testId: number): Promise<Buffer> {
    const test = await prisma.test.findUniqueOrThrow({ where: { id: testId }, include: { subject: true } });
    const attempts = await prisma.attempt.findMany({
      where: { testId, status: { in: ['COMPLETED', 'EXPIRED'] } },
      include: { user: { include: { group: true } } },
      orderBy: { score: 'desc' },
    });
    const itemAnalysis = await analyticsService.getTestItemAnalysis(testId);
    const alpha = await analyticsService.getCronbachAlpha(testId);
    const groupStats = await analyticsService.getGroupAnalytics(testId);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'TIU Test Bot';
    wb.created = new Date();

    // 1-varaq: Umumiy
    const summary = wb.addWorksheet('Umumiy');
    summary.columns = [
      { header: "Ko'rsatkich", key: 'k', width: 35 },
      { header: 'Qiymat', key: 'v', width: 25 },
    ];
    const avgScore = attempts.length
      ? Math.round((attempts.reduce((s, a) => s + (a.score ?? 0), 0) / attempts.length) * 100) / 100
      : 0;
    const passedPercent = attempts.length
      ? Math.round((attempts.filter((a) => (a.score ?? 0) >= test.passScore).length / attempts.length) * 10000) / 100
      : null;
    summary.addRows([
      { k: 'Test nomi', v: test.title },
      { k: 'Fan', v: test.subject.name },
      { k: 'Topshirganlar soni', v: attempts.length },
      { k: "O'rtacha ball", v: avgScore },
      { k: "O'tganlar foizi", v: passedPercent !== null ? `${passedPercent}%` : '-' },
      { k: 'Cronbach alpha (ishonchlilik)', v: alpha ?? "Hisoblash uchun ma'lumot yetarli emas" },
    ]);
    summary.getRow(1).font = { bold: true };

    // 2-varaq: Talabalar bo'yicha
    const students = wb.addWorksheet('Talabalar');
    students.columns = [
      { header: '№', key: 'n', width: 5 },
      { header: 'F.I.Sh.', key: 'name', width: 30 },
      { header: 'Guruh', key: 'group', width: 15 },
      { header: "To'g'ri javob", key: 'correct', width: 15 },
      { header: 'Ball (%)', key: 'score', width: 12 },
      { header: 'Natija', key: 'result', width: 12 },
      { header: 'Holat', key: 'status', width: 15 },
    ];
    attempts.forEach((a, i) => {
      students.addRow({
        n: i + 1,
        name: a.user.fullName,
        group: a.user.group?.name ?? '-',
        correct: `${a.correctCount}/${(a.questionOrder as number[]).length}`,
        score: a.score,
        result: (a.score ?? 0) >= test.passScore ? "O'tdi" : "O'ta olmadi",
        status: a.status === 'EXPIRED' ? 'Vaqt tugadi' : 'Tugatdi',
      });
    });
    students.getRow(1).font = { bold: true };

    // 3-varaq: Savollar tahlili (item analysis)
    const items = wb.addWorksheet('Savollar tahlili');
    items.columns = [
      { header: '№', key: 'n', width: 5 },
      { header: 'Savol', key: 'text', width: 50 },
      { header: 'Javob berganlar', key: 'total', width: 15 },
      { header: "To'g'ri javob %", key: 'difficulty', width: 15 },
      { header: 'Diskriminatsiya indeksi', key: 'discrimination', width: 20 },
      { header: 'Izoh', key: 'note', width: 25 },
    ];
    itemAnalysis.forEach((item, i) => {
      const note =
        item.discriminationIndex < 0.2
          ? "Qayta ko'rib chiqish tavsiya etiladi"
          : item.discriminationIndex >= 0.4
            ? 'Ajoyib ajratuvchanlik'
            : 'Qoniqarli';
      items.addRow({
        n: i + 1,
        text: item.text,
        total: item.totalAnswered,
        difficulty: Math.round(item.difficultyIndex * 1000) / 10,
        discrimination: item.discriminationIndex,
        note,
      });
    });
    items.getRow(1).font = { bold: true };

    // 4-varaq: Distraktor tahlili
    const distractors = wb.addWorksheet('Distraktor tahlili');
    distractors.columns = [
      { header: 'Savol №', key: 'q', width: 10 },
      { header: 'Variant', key: 'opt', width: 50 },
      { header: "To'g'rimi", key: 'correct', width: 10 },
      { header: 'Tanlanganlar soni', key: 'count', width: 18 },
      { header: 'Foiz', key: 'percent', width: 10 },
    ];
    itemAnalysis.forEach((item, qi) => {
      item.distractors.forEach((d) => {
        distractors.addRow({
          q: qi + 1,
          opt: d.optionText,
          correct: d.isCorrect ? 'Ha' : "Yo'q",
          count: d.pickedCount,
          percent: `${d.pickedPercent}%`,
        });
      });
    });
    distractors.getRow(1).font = { bold: true };

    // 5-varaq: Guruhlar bo'yicha
    const groups = wb.addWorksheet('Guruhlar');
    groups.columns = [
      { header: 'Guruh', key: 'group', width: 20 },
      { header: 'Topshirganlar soni', key: 'count', width: 18 },
      { header: "O'rtacha ball", key: 'avg', width: 15 },
      { header: 'Min', key: 'min', width: 10 },
      { header: 'Max', key: 'max', width: 10 },
    ];
    groupStats.forEach((g) => groups.addRow(g));
    groups.getRow(1).font = { bold: true };

    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
  },
};
