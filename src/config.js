import { fileURLToPath } from 'node:url';

// .env faylini Node.js ning o'zi o'qiydi, qo'shimcha kutubxona kerak emas
try {
  process.loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url)));
} catch (error) {
  // .env bo'lmasa, o'zgaruvchilar tizim muhitidan olinadi
  if (error.code !== 'ENOENT') throw error;
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Xato: .env faylida ${name} ko'rsatilmagan.`);
    process.exit(1);
  }
  return value;
}

const adminIds = required('ADMIN_IDS')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

if (!adminIds.every((id) => /^\d+$/.test(id))) {
  console.error("Xato: ADMIN_IDS faqat vergul bilan ajratilgan raqamlardan iborat bo'lishi kerak.");
  process.exit(1);
}

export const config = {
  botToken: required('BOT_TOKEN'),
  databaseUrl: required('DATABASE_URL'),
  adminIds: new Set(adminIds),
};

export const isAdminId = (id) => config.adminIds.has(String(id));
