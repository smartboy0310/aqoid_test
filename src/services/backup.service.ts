import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';

const execFileAsync = promisify(execFile);

export const backupService = {
  async createBackup(): Promise<{ filePath: string; fileName: string }> {
    const dir = path.resolve('backups');
    await mkdir(dir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `tiu-bot-backup-${timestamp}.dump`;
    const filePath = path.join(dir, fileName);

    await execFileAsync('pg_dump', ['--dbname', env.DATABASE_URL, '-F', 'c', '-f', filePath]);

    return { filePath, fileName };
  },
};
