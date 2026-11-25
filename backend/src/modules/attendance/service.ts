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
    if (existing.teacherId !== teacherId) {
      throw { code: 'SESSION_OWNED_BY_ANOTHER_TEACHER', status: 409, message: 'This attendance session belongs to another teacher.' };
    }
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

  const teacher = await prisma.teacher.findUnique({ where: { userId } });
  if (teacher && session.teacherId !== teacher.id) {
    throw { code: 'FORBIDDEN', status: 403, message: 'You cannot edit attendance for another teacher’s session.' };
  }

  if (session.locked) {
    throw {
      code: 'SESSION_LOCKED',
      status: 403,
      message: 'This attendance session is locked and cannot be edited without HOD/Admin unlock',
    };
  }

  // Check auto-lock edit window based on lecture date
  const rules = await prisma.attendanceRule.findFirst();
  const editWindowHours = rules?.editWindowHours ?? 24;
  const windowMs = editWindowHours * 60 * 60 * 1000;
  // End of lecture day in ms (or createdAt, whichever is later)
  const lectureDayEnd = new Date(session.date).setHours(23, 59, 59, 999);
  const effectiveBaseTime = Math.max(session.createdAt.getTime(), lectureDayEnd);
  if (Date.now() - effectiveBaseTime > windowMs) {
    await prisma.attendanceSession.update({
      where: { id: sessionId },
      data: { locked: true, lockedAt: new Date() },
    });
    throw {
      code: 'SESSION_LOCKED',
      status: 403,
      message: `This session was automatically locked after the ${editWindowHours}-hour edit window. Request HOD/Admin unlock to edit.`,
    };
  }

  // Check approved leaves for session date so they are preserved
  const studentIds = input.records.map((r) => r.studentId);
  const enrolledStudents = await prisma.student.findMany({
    where: { id: { in: studentIds }, sectionId: session.sectionId },
    select: { id: true },
  });
  if (enrolledStudents.length !== new Set(studentIds).size) {
    throw { code: 'WRONG_SECTION', status: 403, message: 'Attendance can only be recorded for students enrolled in this session’s section.' };
  }

  const approvedLeaves = await prisma.leaveRequest.findMany({
    where: {
      studentId: { in: studentIds },
      status: 'APPROVED',
      fromDate: { lte: session.date },
      toDate: { gte: session.date },
    },
  });
  const leaveMap = new Map(approvedLeaves.map((l) => [l.studentId, (l.type === 'OD' ? 'OD' : 'LV') as AttendanceStatus]));

  const results = await prisma.$transaction(async (tx) => {
    const updated = [];

    for (const item of input.records) {
      const clientTs = item.clientTs ? new Date(item.clientTs) : new Date();
      // If student was marked Absent but has an approved Leave or OD, preserve it
      const finalStatus = (item.status === 'A' && leaveMap.has(item.studentId))
        ? leaveMap.get(item.studentId)!
        : (item.status as AttendanceStatus);

      const record = await tx.attendanceRecord.upsert({
        where: {
          sessionId_studentId: {
            sessionId,
            studentId: item.studentId,
          },
        },
        update: {
          status: finalStatus,
          method: item.method as MarkingMethod,
          clientTs,
          receivedAt: new Date(),
        },
        create: {
          sessionId,
          studentId: item.studentId,
          status: finalStatus,
          method: item.method as MarkingMethod,
          clientTs,
        },
      });

      // Insert change_log entry for incremental sync pull
      await tx.changeLog.create({
        data: {
          entity: 'attendance',
          entityId: record.id,
          op: 'upsert',
          sectionId: session.sectionId,
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

  const teacher = await prisma.teacher.findUnique({ where: { userId } });
  if (teacher && record.session.teacherId !== teacher.id) {
    throw { code: 'FORBIDDEN', status: 403, message: 'You cannot edit attendance for another teacher’s session.' };
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
