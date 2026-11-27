import ExcelJS from 'exceljs';
import { parse as parseCsvSync } from 'csv-parse/sync';
import mammoth from 'mammoth';
import { parsedQuestionSchema, type ParsedQuestion } from '../validators/question.validator.js';

export interface ImportResult {
  valid: ParsedQuestion[];
  errors: { row: number; message: string }[];
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function toRawQuestion(text: string, variants: (string | undefined)[], correctLetter: string) {
  const options = variants
    .map((v, i) =>
      v?.trim() ? { text: v.trim(), isCorrect: LETTERS[i] === correctLetter.trim().toUpperCase() } : null,
    )
    .filter((o): o is { text: string; isCorrect: boolean } => o !== null);
  return { text: text?.trim(), options };
}

function validateRows(rows: unknown[]): ImportResult {
  const valid: ParsedQuestion[] = [];
  const errors: { row: number; message: string }[] = [];
  rows.forEach((raw, i) => {
    const parsed = parsedQuestionSchema.safeParse(raw);
    if (parsed.success) valid.push(parsed.data);
    else errors.push({ row: i + 2, message: parsed.error.issues[0]?.message ?? "Noma'lum xatolik" });
  });
  return { valid, errors };
}

export const importService = {
  async parseExcel(buffer: Buffer): Promise<ImportResult> {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    const sheet = wb.worksheets[0];
    const rows: unknown[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const [, savol, a, b, c, d, togri] = row.values as (string | undefined)[];
      rows.push(toRawQuestion(savol ?? '', [a, b, c, d], togri ?? ''));
    });
    return validateRows(rows);
  },

  parseCsv(buffer: Buffer): ImportResult {
    const records: Record<string, string>[] = parseCsvSync(buffer, {
      columns: true,
      skip_empty_lines: true,
      bom: true,
    });
    const rows = records.map((r) =>
      toRawQuestion(r['Savol'], [r['Variant A'], r['Variant B'], r['Variant C'], r['Variant D']], r['Togri']),
    );
    return validateRows(rows);
  },

  async parseDocx(buffer: Buffer): Promise<ImportResult> {
    const { value: text } = await mammoth.extractRawText({ buffer });
    const blocks = text.split(/\n\s*\n/).filter((b) => b.trim());
    const rows = blocks.map((block) => {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
      const questionText = lines[0]?.replace(/^\d+[.)]\s*/, '');
      const options = lines
        .slice(1)
        .map((line) => {
          const m = line.match(/^[A-F][).]\s*(.+?)(\*)?$/);
          return m ? { text: m[1].trim(), isCorrect: Boolean(m[2]) } : null;
        })
        .filter((o): o is { text: string; isCorrect: boolean } => o !== null);
      return { text: questionText, options };
    });
    return validateRows(rows);
  },
};
