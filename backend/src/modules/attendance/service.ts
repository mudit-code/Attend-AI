import { prisma } from '../../lib/prisma';
import type { AttendanceStatus, MarkingMethod } from '@prisma/client';
import type {
  CreateSessionInput,
  MarkRecordsInput,
  UpdateRecordInput,
  UnlockSessionInput,
} from './schema';

// ─── Create Session ───────────────────────────────────────────────
export async function createSession(teacherId: number, input: CreateSessionInput) {
  const sessionDate = new Date(`${input.date}T00:00:00.000Z`);

  // Check if session already exists for this section, subject, date, period
  const existing = await prisma.attendanceSession.findUnique({
    where: {
      sectionId_subjectId_date_period: {
        sectionId: input.sectionId,
        subjectId: input.subjectId,
        date: sessionDate,
        period: input.period,
      },
    },
  });

  if (existing) {
    return existing;
  }

  // Check for conflict: another session by different teacher in this section at same date/period
  const conflictingSession = await prisma.attendanceSession.findFirst({
    where: {
      sectionId: input.sectionId,
      date: sessionDate,
      period: input.period,
    },
  });

  const session = await prisma.attendanceSession.create({
    data: {
      teacherId,
      sectionId: input.sectionId,
      subjectId: input.subjectId,
      date: sessionDate,
      period: input.period,
    },
    include: {
      section: true,
      subject: true,
      teacher: { include: { user: { select: { name: true } } } },
    },
  });

  if (conflictingSession) {
    await prisma.attendanceConflict.create({
      data: {
        sessionId: session.id,
        otherSessionId: conflictingSession.id,
        status: 'pending',
        notes: `Overlap detected at period ${input.period}`,
      },
    });
  }

  return session;
}

// ─── Get Session Details ──────────────────────────────────────────
export async function getSession(sessionId: string) {
  const session = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
    include: {
      section: {
        include: {
          students: {
            include: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { rollNo: 'asc' },
          },
        },
      },
      subject: true,
      teacher: { include: { user: { select: { name: true, email: true } } } },
      records: {
        include: {
          student: { include: { user: { select: { name: true } } } },
        },
      },
    },
  });

  if (!session) {
    throw { code: 'NOT_FOUND', status: 404, message: 'Attendance session not found' };
  }

  return session;
}

// ─── Mark Attendance Records ──────────────────────────────────────
export async function markRecords(
  sessionId: string,
  userId: number,
  input: MarkRecordsInput,
  clientIp?: string
) {
  const session = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw { code: 'NOT_FOUND', status: 404, message: 'Session not found' };
  }

  if (session.locked) {
    throw {
      code: 'SESSION_LOCKED',
      status: 403,
      message: 'This attendance session is locked and cannot be edited without HOD/Admin unlock',
    };
  }

  const results = await prisma.$transaction(async (tx) => {
    const updated = [];

    for (const item of input.records) {
      const clientTs = item.clientTs ? new Date(item.clientTs) : new Date();

      const record = await tx.attendanceRecord.upsert({
        where: {
          sessionId_studentId: {
            sessionId,
            studentId: item.studentId,
          },
        },
        update: {
          status: item.status as AttendanceStatus,
          method: item.method as MarkingMethod,
          clientTs,
          receivedAt: new Date(),
        },
        create: {
          sessionId,
          studentId: item.studentId,
          status: item.status as AttendanceStatus,
          method: item.method as MarkingMethod,
          clientTs,
        },
      });

      updated.push(record);
    }

    // Append-only audit log
    await tx.auditLog.create({
      data: {
        userId,
        action: 'mark_attendance',
        entity: 'attendance_session',
        entityId: sessionId,
        newValue: { count: input.records.length, sample: input.records.slice(0, 3) },
        ip: clientIp,
      },
    });

    return updated;
  });

  return results;
}

// ─── Update Single Record ─────────────────────────────────────────
export async function updateRecord(
  recordId: string,
  userId: number,
  input: UpdateRecordInput,
  clientIp?: string
) {
  const record = await prisma.attendanceRecord.findUnique({
    where: { id: recordId },
    include: { session: true },
  });

  if (!record) {
    throw { code: 'NOT_FOUND', status: 404, message: 'Attendance record not found' };
  }

  if (record.session.locked) {
    throw { code: 'SESSION_LOCKED', status: 403, message: 'Session is locked' };
  }

  const oldStatus = record.status;

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.attendanceRecord.update({
      where: { id: recordId },
      data: {
        status: input.status as AttendanceStatus,
        method: input.method ? (input.method as MarkingMethod) : record.method,
      },
    });

    await tx.auditLog.create({
      data: {
        userId,
        action: 'edit_record',
        entity: 'attendance_record',
        entityId: recordId,
        oldValue: { status: oldStatus },
        newValue: { status: input.status, reason: input.reason },
        ip: clientIp,
      },
    });

    return res;
  });

  return updated;
}

// ─── Unlock Session ───────────────────────────────────────────────
export async function unlockSession(
  sessionId: string,
  userId: number,
  input: UnlockSessionInput,
  clientIp?: string
) {
  const session = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw { code: 'NOT_FOUND', status: 404, message: 'Session not found' };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.attendanceSession.update({
      where: { id: sessionId },
      data: { locked: false, lockedAt: null },
    });

    await tx.auditLog.create({
      data: {
        userId,
        action: 'unlock_session',
        entity: 'attendance_session',
        entityId: sessionId,
        newValue: { reason: input.reason },
        ip: clientIp,
      },
    });

    return res;
  });

  return updated;
}

// ─── Get Teacher Sessions ─────────────────────────────────────────
export async function getTeacherSessions(teacherId: number, limit = 20) {
  return prisma.attendanceSession.findMany({
    where: { teacherId },
    include: {
      section: true,
      subject: true,
      _count: { select: { records: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
