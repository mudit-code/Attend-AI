import Dexie, { type Table } from 'dexie';

// ─── Types ────────────────────────────────────────────────────────
export interface LocalUser {
  id: number;
  name: string;
  email: string;
  role: string;
  pinHash?: string; // PBKDF2 for offline PIN login
}

export interface LocalStudent {
  id: number;
  userId: number;
  rollNo: string;
  name: string;
  sectionId: number;
}

export interface LocalSection {
  id: number;
  name: string;
  year: number;
  courseId: number;
}

export interface LocalSubject {
  id: number;
  name: string;
  code: string;
}

export interface LocalTimetableSlot {
  id: number;
  sectionId: number;
  subjectId: number;
  teacherId: number;
  dayOfWeek: number;
  period: number;
  startTime: string;
  endTime: string;
}

export interface OutboxItem {
  id: string;        // UUID v4 — client-generated
  type: 'attendance_session' | 'attendance_record' | 'leave_request' | 'correction_request';
  payload: Record<string, unknown>;
  status: 'pending' | 'done' | 'failed' | 'conflict';
  attempts: number;
  createdAt: string;
  updatedAt: string;
  error?: string;
}

export interface SyncMeta {
  key: string;       // "cursor" | "lastSyncAt" | "bootstrapped"
  value: string | number;
}

export interface OfflineError {
  id?: number;       // autoincrement
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

// ─── Database ─────────────────────────────────────────────────────
export class AttendAIDatabase extends Dexie {
  users!: Table<LocalUser>;
  students!: Table<LocalStudent>;
  sections!: Table<LocalSection>;
  subjects!: Table<LocalSubject>;
  timetableSlots!: Table<LocalTimetableSlot>;
  outbox!: Table<OutboxItem>;
  syncMeta!: Table<SyncMeta>;
  offlineErrors!: Table<OfflineError>;

  constructor() {
    super('AttendAI');

    this.version(1).stores({
      users: 'id, role',
      students: 'id, sectionId, rollNo',
      sections: 'id, courseId',
      subjects: 'id, code',
      timetableSlots: 'id, sectionId, dayOfWeek, period',
      outbox: 'id, status, type, createdAt',
      syncMeta: 'key',
      offlineErrors: '++id, timestamp',
    });
  }
}

export const db = new AttendAIDatabase();
