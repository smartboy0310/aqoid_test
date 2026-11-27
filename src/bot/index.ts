import { Telegraf, Scenes } from 'telegraf';
import { env } from '../config/env.js';
import type { BotContext } from '../types/context.js';
import { rateLimitMiddleware } from './middlewares/rateLimit.middleware.js';
import { sessionMiddleware } from './middlewares/session.middleware.js';
import { authMiddleware } from './middlewares/auth.middleware.js';
import { requireRole } from './middlewares/role.middleware.js';
import { errorHandlerMiddleware } from './middlewares/errorHandler.middleware.js';
import { registrationScene } from './scenes/registration.scene.js';
import { testCreationScene } from './scenes/testCreation.scene.js';
import { questionImportScene } from './scenes/questionImport.scene.js';
import { userManagementScene } from './scenes/userManagement.scene.js';
import { broadcastScene } from './scenes/broadcast.scene.js';
import { startHandler } from './handlers/student/start.handler.js';
import { testListHandler } from './handlers/student/testList.handler.js';
import { startTestHandler, answerHandler } from './handlers/student/testTaking.handler.js';
import { reviewHandler } from './handlers/student/review.handler.js';
import { historyHandler } from './handlers/student/history.handler.js';
import { statsHandler } from './handlers/student/stats.handler.js';
import { myTestsHandler } from './handlers/teacher/testManagement.handler.js';
import {
  resultsMenuHandler,
  liveTestListHandler,
  liveMonitorHandler,
  reportTestListHandler,
  reportRequestHandler,
} from './handlers/teacher/results.handler.js';
import { userManagementEntryHandler } from './handlers/admin/userManagement.handler.js';
import { broadcastEntryHandler } from './handlers/admin/broadcast.handler.js';
import { dashboardHandler } from './handlers/admin/dashboard.handler.js';
import { backupHandler } from './handlers/admin/backup.handler.js';
import { t } from '../i18n/uz.js';

export function createBot() {
  const bot = new Telegraf<BotContext>(env.BOT_TOKEN);
  const stage = new Scenes.Stage<BotContext>([
    registrationScene,
    testCreationScene,
    questionImportScene,
    userManagementScene,
    broadcastScene,
  ]);

  bot.use(rateLimitMiddleware);
  bot.use(sessionMiddleware);
  bot.use(authMiddleware);
  bot.use(stage.middleware());

  bot.catch(errorHandlerMiddleware);
  bot.start(startHandler);

  // o'qituvchi
  bot.hears(t.menu.teacher[0], requireRole(['TEACHER', 'ADMIN']), myTestsHandler);
  bot.action('test:new', requireRole(['TEACHER', 'ADMIN']), (ctx) => ctx.scene.enter('testCreation'));
  bot.hears(t.menu.teacher[2], requireRole(['TEACHER', 'ADMIN']), resultsMenuHandler);
  bot.action('results:live', requireRole(['TEACHER', 'ADMIN']), liveTestListHandler);
  bot.action(/^live:(\d+)$/, requireRole(['TEACHER', 'ADMIN']), liveMonitorHandler);
  bot.action('results:report', requireRole(['TEACHER', 'ADMIN']), reportTestListHandler);
  bot.action(/^report:(\d+)$/, requireRole(['TEACHER', 'ADMIN']), reportRequestHandler);

  // talaba
  bot.hears(t.menu.student[0], requireRole(['STUDENT']), testListHandler);
  bot.hears(t.menu.student[1], requireRole(['STUDENT']), historyHandler);
  bot.hears(t.menu.student[2], requireRole(['STUDENT']), statsHandler);
  bot.action(/^start_test:(\d+)$/, requireRole(['STUDENT']), startTestHandler);
  bot.action(/^ans:(\d+):(\d+):(\d+)$/, requireRole(['STUDENT']), answerHandler);
  bot.action(/^review:(\d+)$/, requireRole(['STUDENT']), reviewHandler);

  // admin
  bot.hears(t.menu.admin[0], requireRole(['ADMIN']), userManagementEntryHandler);
  bot.hears(t.menu.admin[1], requireRole(['ADMIN']), broadcastEntryHandler);
  bot.hears(t.menu.admin[2], requireRole(['ADMIN']), dashboardHandler);
  bot.hears(t.menu.admin[3], requireRole(['ADMIN']), backupHandler);

  return bot;
}
