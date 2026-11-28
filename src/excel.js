import ExcelJS from 'exceljs';
import { formatDate, percent } from './ui.js';

export async function buildReport(rows) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Natijalar', { views: [{ state: 'frozen', ySplit: 1 }] });

  sheet.columns = [
    { header: 'F.I.Sh.', key: 'name', width: 35 },
    { header: 'Guruh', key: 'group', width: 18 },
    { header: 'Fan', key: 'subject', width: 28 },
    { header: 'Test nomi', key: 'title', width: 28 },
    { header: "To'g'ri javoblar soni", key: 'correct', width: 22 },
    { header: 'Jami savollar', key: 'total', width: 15 },
    { header: 'Foiz', key: 'percent', width: 10 },
    { header: 'Boshlagan vaqti', key: 'started', width: 19 },
    { header: 'Tugatgan vaqti', key: 'finished', width: 19 },
  ];

  for (const row of rows) {
    sheet.addRow({
      name: row.full_name,
      group: row.group_name,
      subject: row.subject,
      title: row.title,
      correct: row.correct,
      total: row.total,
      percent: percent(row.correct, row.total),
      started: formatDate(row.started_at),
      finished: formatDate(row.finished_at),
    });
  }

  sheet.getRow(1).font = { bold: true };
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
