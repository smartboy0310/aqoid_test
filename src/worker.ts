import 'dotenv/config';
import { logger } from './utils/logger.js';
import './queues/attemptTimeout.worker.js';
import './queues/report.worker.js';
import './queues/broadcast.worker.js';
import './queues/backup.worker.js';

logger.info(
  "Worker jarayoni ishga tushdi: 'attempt-timeout', 'reports', 'broadcast', 'backup' navbatlarini kutmoqda...",
);

process.once('SIGINT', () => process.exit(0));
process.once('SIGTERM', () => process.exit(0));
