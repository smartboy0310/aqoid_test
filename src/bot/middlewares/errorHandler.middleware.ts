import type { Context } from 'telegraf';
import { logger } from '../../utils/logger.js';

export function errorHandlerMiddleware(err: unknown, ctx: Context) {
  logger.error({ err, updateType: ctx.updateType, from: ctx.from?.id }, 'Botda ushlanmagan xatolik');
  ctx.reply("Kechirasiz, kutilmagan xatolik yuz berdi. Birozdan keyin qayta urinib ko'ring.").catch(() => {});
}
