import type { BotContext } from '../../../types/context.js';

export async function broadcastEntryHandler(ctx: BotContext) {
  await ctx.scene.enter('broadcast');
}
