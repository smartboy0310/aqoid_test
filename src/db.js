import pg from 'pg';
import { config } from './config.js';

export const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 10 });

// Bo'sh turgan ulanish uzilsa, bot to'xtab qolmasligi kerak
pool.on('error', (error) => console.error('Baza ulanishida xato:', error.message));

export const query = async (sql, params) => (await pool.query(sql, params)).rows;
export const one = async (sql, params) => (await query(sql, params))[0];

// Bir nechta so'rovni bitta tranzaksiyada bajaradi
export async function tx(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS groups (
  id    SERIAL PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS users (
  id          BIGINT PRIMARY KEY,
  username    TEXT,
  full_name   TEXT,
  group_id    INT REFERENCES groups(id) ON DELETE SET NULL,
  is_teacher  BOOLEAN NOT NULL DEFAULT FALSE,
  is_blocked  BOOLEAN NOT NULL DEFAULT FALSE,
  state       TEXT,
  data        JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tests (
  id              SERIAL PRIMARY KEY,
  subject         TEXT NOT NULL,
  title           TEXT NOT NULL,
  created_by      BIGINT NOT NULL REFERENCES users(id),
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  duration_min    INT NOT NULL CHECK (duration_min > 0),
  question_count  INT NOT NULL CHECK (question_count > 0),
  stopped_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS test_groups (
  test_id   INT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  group_id  INT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  PRIMARY KEY (test_id, group_id)
);

CREATE TABLE IF NOT EXISTS questions (
  id       SERIAL PRIMARY KEY,
  test_id  INT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  text     TEXT NOT NULL,
  options  JSONB NOT NULL,
  correct  INT NOT NULL
);
CREATE INDEX IF NOT EXISTS questions_test_idx ON questions(test_id);

-- full_name va group_name nusxasi saqlanadi: guruh o'chirilsa ham natija yo'qolmaydi
CREATE TABLE IF NOT EXISTS attempts (
  id           SERIAL PRIMARY KEY,
  test_id      INT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  user_id      BIGINT NOT NULL REFERENCES users(id),
  full_name    TEXT NOT NULL,
  group_id     INT REFERENCES groups(id) ON DELETE SET NULL,
  group_name   TEXT NOT NULL,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at  TIMESTAMPTZ,
  total        INT NOT NULL DEFAULT 0,
  correct      INT,
  message_id   BIGINT,
  UNIQUE (test_id, user_id)
);
CREATE INDEX IF NOT EXISTS attempts_open_idx ON attempts(id) WHERE finished_at IS NULL;

-- option_order: variantlarning aralashtirilgan tartibi, chosen: tanlangan variantning asl raqami
CREATE TABLE IF NOT EXISTS attempt_questions (
  attempt_id    INT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  position      INT NOT NULL,
  question_id   INT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  option_order  INT[] NOT NULL,
  chosen        INT,
  PRIMARY KEY (attempt_id, position)
);
`;

export async function initDb() {
  await pool.query(SCHEMA);
}

// ---------- Foydalanuvchilar ----------

export function upsertUser(from) {
  return one(
    `INSERT INTO users (id, username) VALUES ($1, $2)
     ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username
     RETURNING *`,
    [from.id, from.username ?? null],
  );
}

// Suhbat holati bazada saqlanadi, shuning uchun bot qayta ishga tushsa ham yo'qolmaydi
export async function setState(ctx, state, data = {}) {
  await query('UPDATE users SET state = $2, data = $3 WHERE id = $1', [ctx.from.id, state, JSON.stringify(data)]);
  ctx.user.state = state;
  ctx.user.data = data;
}

// ---------- Test ishlash ----------

// Urinishning tugash vaqti: boshlangan vaqt + davomiylik, test yopilishi yoki to'xtatilishi
// (qaysi biri oldin kelsa). LEAST NULL qiymatni hisobga olmaydi.
const DEADLINE = 'LEAST(a.started_at + make_interval(mins => t.duration_min), t.ends_at, t.stopped_at)';

// Talaba hozir ishlashi yoki davom ettirishi mumkin bo'lgan testlar
export function availableTests(user) {
  return query(
    `SELECT t.id, t.subject, t.title, t.duration_min, t.question_count, t.ends_at,
            (a.id IS NOT NULL) AS started
     FROM tests t
     LEFT JOIN attempts a ON a.test_id = t.id AND a.user_id = $1
     WHERE t.stopped_at IS NULL AND now() >= t.starts_at AND now() < t.ends_at
       AND (
         (a.id IS NULL AND EXISTS (
           SELECT 1 FROM test_groups tg WHERE tg.test_id = t.id AND tg.group_id = $2))
         OR (a.id IS NOT NULL AND a.finished_at IS NULL AND now() < ${DEADLINE})
       )
     ORDER BY t.ends_at, t.id`,
    [user.id, user.group_id],
  );
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Mavjud urinish ID sini qaytaradi yoki yangisini yaratadi. Test yopiq bo'lsa null.
export function startAttempt(testId, user) {
  return tx(async (db) => {
    const findSql = 'SELECT id FROM attempts WHERE test_id = $1 AND user_id = $2';
    const existing = (await db.query(findSql, [testId, user.id])).rows[0];
    if (existing) return existing.id;

    const test = (await db.query(
      `SELECT t.question_count FROM tests t
       JOIN test_groups tg ON tg.test_id = t.id AND tg.group_id = $2
       WHERE t.id = $1 AND t.stopped_at IS NULL AND now() >= t.starts_at AND now() < t.ends_at`,
      [testId, user.group_id],
    )).rows[0];
    if (!test) return null;

    // UNIQUE (test_id, user_id) bitta urinishni kafolatlaydi
    const attempt = (await db.query(
      `INSERT INTO attempts (test_id, user_id, full_name, group_id, group_name)
       SELECT $1, $2, $3, g.id, g.name FROM groups g WHERE g.id = $4
       ON CONFLICT (test_id, user_id) DO NOTHING
       RETURNING id`,
      [testId, user.id, user.full_name, user.group_id],
    )).rows[0];
    if (!attempt) return (await db.query(findSql, [testId, user.id])).rows[0]?.id ?? null;

    const questions = (await db.query(
      `SELECT id, jsonb_array_length(options) AS size FROM questions
       WHERE test_id = $1 ORDER BY random() LIMIT $2`,
      [testId, test.question_count],
    )).rows;

    const rows = questions.map((question, index) => ({
      position: index + 1,
      question_id: question.id,
      option_order: shuffle([...Array(question.size).keys()]),
    }));

    await db.query(
      `INSERT INTO attempt_questions (attempt_id, position, question_id, option_order)
       SELECT $1, x.position, x.question_id, x.option_order
       FROM jsonb_to_recordset($2::jsonb) AS x(position int, question_id int, option_order int[])`,
      [attempt.id, JSON.stringify(rows)],
    );
    await db.query('UPDATE attempts SET total = $2 WHERE id = $1', [attempt.id, rows.length]);
    return attempt.id;
  });
}

// Javob berilmagan birinchi savol
export function currentQuestion(attemptId, userId) {
  return one(
    `SELECT aq.position, a.total, q.text, q.options, aq.option_order,
            EXTRACT(EPOCH FROM (${DEADLINE} - now()))::float8 AS seconds_left
     FROM attempts a
     JOIN tests t ON t.id = a.test_id
     JOIN attempt_questions aq ON aq.attempt_id = a.id AND aq.chosen IS NULL
     JOIN questions q ON q.id = aq.question_id
     WHERE a.id = $1 AND a.user_id = $2 AND a.finished_at IS NULL
     ORDER BY aq.position
     LIMIT 1`,
    [attemptId, userId],
  );
}

export async function setAttemptMessage(attemptId, messageId) {
  await query('UPDATE attempts SET message_id = $2 WHERE id = $1', [attemptId, messageId]);
}

// Natija: 'ok' | 'stale' (eski tugma) | 'closed' (vaqt tugagan) | 'notfound'
export function saveAnswer({ attemptId, userId, messageId, position, choice }) {
  return tx(async (db) => {
    // FOR UPDATE: javob yozish va testni yopish bir vaqtda bajarilmaydi
    const attempt = (await db.query(
      `SELECT a.finished_at, a.message_id, (now() >= ${DEADLINE}) AS expired
       FROM attempts a JOIN tests t ON t.id = a.test_id
       WHERE a.id = $1 AND a.user_id = $2
       FOR UPDATE OF a`,
      [attemptId, userId],
    )).rows[0];

    if (!attempt) return 'notfound';
    if (attempt.finished_at || attempt.expired) return 'closed';
    if (String(attempt.message_id) !== String(messageId)) return 'stale';

    // Faqat joriy (javobsiz birinchi) savolga javob yoziladi
    const result = await db.query(
      `UPDATE attempt_questions SET chosen = option_order[$3::int + 1]
       WHERE attempt_id = $1 AND position = $2 AND chosen IS NULL
         AND $3::int < cardinality(option_order)
         AND position = (SELECT min(position) FROM attempt_questions
                         WHERE attempt_id = $1 AND chosen IS NULL)`,
      [attemptId, position, choice],
    );
    return result.rowCount === 1 ? 'ok' : 'stale';
  });
}

// Vaqt tugagan yoki barcha savollarga javob berilgan bo'lsa, urinishni yopadi.
// Aynan shu chaqiruvda yopilgan bo'lsa true qaytaradi.
export function finishAttempt(attemptId) {
  return tx(async (db) => {
    const attempt = (await db.query(
      `SELECT a.finished_at, (now() >= ${DEADLINE}) AS expired
       FROM attempts a JOIN tests t ON t.id = a.test_id
       WHERE a.id = $1
       FOR UPDATE OF a`,
      [attemptId],
    )).rows[0];
    if (!attempt || attempt.finished_at) return false;

    if (!attempt.expired) {
      const left = await db.query(
        'SELECT 1 FROM attempt_questions WHERE attempt_id = $1 AND chosen IS NULL LIMIT 1',
        [attemptId],
      );
      if (left.rowCount > 0) return false;
    }

    await db.query(
      `UPDATE attempts a SET
         finished_at = LEAST(now(), ${DEADLINE}),
         correct = (SELECT count(*) FROM attempt_questions aq
                    JOIN questions q ON q.id = aq.question_id
                    WHERE aq.attempt_id = $1 AND aq.chosen = q.correct)
       FROM tests t
       WHERE a.id = $1 AND t.id = a.test_id`,
      [attemptId],
    );
    return true;
  });
}

export function finishedAttempt(attemptId, userId) {
  return one(
    `SELECT a.correct, a.total, a.message_id, t.subject, t.title
     FROM attempts a JOIN tests t ON t.id = a.test_id
     WHERE a.id = $1 AND a.user_id = $2 AND a.finished_at IS NOT NULL`,
    [attemptId, userId],
  );
}

export function expiredAttempts() {
  return query(
    `SELECT a.id, a.user_id, u.is_blocked
     FROM attempts a
     JOIN tests t ON t.id = a.test_id
     JOIN users u ON u.id = a.user_id
     WHERE a.finished_at IS NULL AND now() >= ${DEADLINE}`,
  );
}
