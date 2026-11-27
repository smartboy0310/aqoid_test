import type { BotContext } from '../../../types/context.js';

export async function userManagementEntryHandler(ctx: BotContext) {
  await ctx.scene.enter('userManagement');
}
