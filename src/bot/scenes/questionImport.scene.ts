import { Scenes } from 'telegraf';
import type { BotContext } from '../../types/context.js';
import { importService } from '../../services/import.service.js';
import { testService } from '../../services/test.service.js';
import { parsedQuestionSchema } from '../../validators/question.validator.js';
import { t } from '../../i18n/uz.js';
import { questionImportMenuKeyboard, finishKeyboard } from '../keyboards/questionImport.keyboards.js';

export const questionImportScene = new Scenes.WizardScene<BotContext>(
  'questionImport',

  async (ctx) => {
    const { testId } = ctx.scene.state as { testId: number };
    ctx.scene.session.testId = testId;
    await ctx.reply(t.questionImport.menu, questionImportMenuKeyboard());
    return ctx.wizard.next();
  },

  async (ctx) => {
    const data = ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;

    if (data === 'qi:manual') {
      await ctx.answerCbQuery();
      ctx.scene.session.mode = 'manual';
      await ctx.reply(t.questionImport.manualTemplate);
      return;
    }

    if (data === 'qi:file') {
      await ctx.answerCbQuery();
      ctx.scene.session.mode = 'file';
      await ctx.reply(t.questionImport.fileTemplate);
      return;
    }

    if (data === 'qi:finish') {
      await ctx.answerCbQuery();
      const count = await testService.countQuestions(ctx.scene.session.testId!);
      if (count === 0) {
        await ctx.reply(t.questionImport.needAtLeastOne);
        return;
      }
      await testService.publishTest(ctx.scene.session.testId!);
      await ctx.reply(t.questionImport.published(count));
      return ctx.scene.leave();
    }

    if (ctx.scene.session.mode === 'manual' && ctx.message && 'text' in ctx.message) {
      const lines = ctx.message.text.split('\n').map((l) => l.trim()).filter(Boolean);
      const options = lines
        .slice(1)
        .map((line) => {
          const m = line.match(/^[A-F][).]\s*(.+?)(\*)?$/);
          return m ? { text: m[1].trim(), isCorrect: Boolean(m[2]) } : null;
        })
        .filter((o): o is { text: string; isCorrect: boolean } => o !== null);

      const parsed = parsedQuestionSchema.safeParse({ text: lines[0], options });
      if (!parsed.success) {
        await ctx.reply(t.questionImport.manualError(parsed.error.issues[0].message));
        return;
      }
      await testService.addQuestions(ctx.scene.session.testId!, [parsed.data]);
      const count = await testService.countQuestions(ctx.scene.session.testId!);
      await ctx.reply(t.questionImport.manualAdded(count), finishKeyboard());
      return;
    }

    if (ctx.scene.session.mode === 'file' && ctx.message && 'document' in ctx.message) {
      const doc = ctx.message.document;
      const fileLink = await ctx.telegram.getFileLink(doc.file_id);
      const response = await fetch(fileLink.href);
      const buffer = Buffer.from(await response.arrayBuffer());

      let result;
      if (doc.file_name?.endsWith('.xlsx')) result = await importService.parseExcel(buffer);
      else if (doc.file_name?.endsWith('.csv')) result = importService.parseCsv(buffer);
      else if (doc.file_name?.endsWith('.docx')) result = await importService.parseDocx(buffer);
      else {
        await ctx.reply(t.questionImport.unsupportedFormat);
        return;
      }

      if (result.valid.length > 0) await testService.addQuestions(ctx.scene.session.testId!, result.valid);
      const count = await testService.countQuestions(ctx.scene.session.testId!);
      await ctx.reply(t.questionImport.fileResult(result.valid.length, result.errors, count), finishKeyboard());
      return;
    }

    await ctx.reply(t.registration.pressButton);
  },
);
