import type { BotContext } from '../../../types/context.js';
import { enqueueBackup } from '../../../queues/backup.queue.js';
import { t } from '../../../i18n/uz.js';

export async function backupHandler(ctx: BotContext) {
  await enqueueBackup(ctx.from!.id);
  await ctx.reply(t.backup.preparing);
}
