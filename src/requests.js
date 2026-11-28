// O'qituvchi roli so'rovlari: yaratish, adminlarga yuborish, qaror qabul qilish
import { InlineKeyboard } from 'grammy';
import { config } from './config.js';
import { one, query } from './db.js';

export const WAITING_TEXT = "So'rovingiz admin tasdig'ini kutmoqda.";

// So'rov faqat ism kiritgan, guruhi va roli yo'q, avval so'rov yubormagan foydalanuvchiga ochiq.
// Shart bajarilmasa undefined qaytadi.
export function createTeacherRequest(userId) {
  return one(
    `UPDATE users SET teacher_request = 'pending', teacher_request_no = teacher_request_no + 1,
       state = NULL, data = '{}'
     WHERE id = $1 AND full_name IS NOT NULL AND group_id IS NULL
       AND NOT is_teacher AND teacher_request IS NULL
     RETURNING id, username, full_name, teacher_request_no`,
    [userId],
  );
}

async function sendRequest(api, adminId, user) {
  const text =
    "🆕 O'qituvchi roli uchun so'rov\n\n" +
    `Ism-familiya: ${user.full_name}\n` +
    `Username: ${user.username ? `@${user.username}` : '—'}\n` +
    `ID: ${user.id}`;
  const data = `a:treq:${user.id}:${user.teacher_request_no}`;
  const keyboard = new InlineKeyboard()
    .text('✅ Tasdiqlash', `${data}:1`)
    .text('❌ Rad etish', `${data}:0`);
  try {
    await api.sendMessage(adminId, text, { reply_markup: keyboard });
  } catch (error) {
    // Masalan, admin botga hali /start bosmagan
    console.error(`So'rovni adminga yuborib bo'lmadi (${adminId}):`, error.message);
  }
}

export async function notifyAdmins(api, user) {
  for (const adminId of config.adminIds) {
    await sendRequest(api, adminId, user);
  }
}

export async function sendPendingRequests(api, adminId) {
  const users = await query(
    `SELECT id, username, full_name, teacher_request_no FROM users
     WHERE teacher_request = 'pending' AND NOT is_blocked
     ORDER BY created_at LIMIT 20`,
  );
  for (const user of users) {
    await sendRequest(api, adminId, user);
  }
}

// Faqat kutilayotgan va raqami mos so'rov o'zgaradi. Bir nechta admin bossa, birinchisi hisoblanadi.
export function decideTeacherRequest(userId, requestNo, approve) {
  return one(
    `UPDATE users SET is_teacher = $3,
       teacher_request = CASE WHEN $3 THEN NULL ELSE 'rejected' END,
       state = NULL, data = '{}'
     WHERE id = $1 AND teacher_request_no = $2 AND teacher_request = 'pending'
     RETURNING full_name, is_blocked`,
    [userId, requestNo, approve],
  );
}
