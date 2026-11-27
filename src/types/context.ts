import type { Scenes } from 'telegraf';
import type { User } from '@prisma/client';

export interface AppWizardSession extends Scenes.WizardSessionData {
  // registration
  fullName?: string;
  facultyId?: number;
  course?: number;
  groupId?: number;
  // testCreation
  title?: string;
  subjectId?: number;
  awaitingNewSubject?: boolean;
  settings?: {
    timeLimitSec: number;
    maxAttempts: number;
    passScore: number;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
  };
  schedule?: { opensAt: Date | null; closesAt: Date | null };
  selectedGroupIds?: number[];
  // questionImport
  testId?: number;
  mode?: 'manual' | 'file';
  // userManagement
  umAction?: 'promote' | 'demote' | 'block' | 'unblock';
  umTargetUserId?: number;
  // broadcast
  broadcastTarget?: 'ALL' | 'STUDENT' | 'TEACHER';
  broadcastText?: string;
}

export interface BotContext extends Scenes.WizardContext<AppWizardSession> {
  dbUser?: User | null;
}
