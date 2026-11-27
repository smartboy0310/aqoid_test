import 'dotenv/config';
import { createBot } from './bot/index.js';
import { logger } from './utils/logger.js';

const bot = createBot();

async function main() {
  await bot.launch();
  logger.info('Bot long polling rejimida ishga tushdi');
}

main().catch((err) => {
  logger.error({ err }, 'Botni ishga tushirishda xatolik');
  process.exit(1);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
