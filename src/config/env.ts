import * as z from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  BOT_TOKEN: z.string().min(1, 'BOT_TOKEN majburiy'),
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
  SUPER_ADMIN_TELEGRAM_ID: z.coerce.number().int().positive(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  TZ: z.string().default('Asia/Tashkent'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('.env faylida xatolik topildi:');
  console.error(z.treeifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
