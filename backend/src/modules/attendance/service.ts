import { prisma } from '../../lib/prisma';
import { isWithinCampus } from '../../lib/geofence';
import { sendAbsenteeEmailBatch } from '../../lib/email';
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
      const adjustment = await prisma.classAdjustment.findFirst({
        where: {
          sectionId: input.sectionId,
          date: sessionDate,
          period: input.period,
          substituteTeacherId: teacherId,
          status: 'ACTIVE',
        },
      });
      if (!adjustment) {
        throw { code: 'SESSION_OWNED_BY_ANOTHER_TEACHER', status: 409, message: 'This attendance session belongs to another teacher.' };
      }
      return prisma.attendanceSession.update({
        where: { id: existing.id },
        data: { conductedByTeacherId: teacherId, isSubstitution: true },
        include: {
          section: true,
          subject: true,
          teacher: { include: { user: { select: { name: true } } } },
        },
      });
    }
    return existing;
  }

  // Check if caller is taking as substitute
  const adjustment = await prisma.classAdjustment.findFirst({
    where: {
      sectionId: input.sectionId,
      date: sessionDate,
      period: input.period,
      substituteTeacherId: teacherId,
      status: 'ACTIVE',
    },
  });

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
      teacherId: adjustment ? adjustment.originalTeacherId : teacherId,
      conductedByTeacherId: adjustment ? teacherId : null,
      isSubstitution: Boolean(adjustment),
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
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  const isSuper = user?.role === 'HOD' || user?.role === 'ADMIN';
  const isSubstitute = teacher && session.conductedByTeacherId === teacher.id;
  const isOwner = teacher && session.teacherId === teacher.id;

  if (teacher && !isOwner && !isSubstitute && !isSuper) {
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

  // ── Dispatch absentee notification emails asynchronously ──
  const absentStudentIds = input.records
    .filter((r) => r.status === 'A' && !leaveMap.has(r.studentId))
    .map((r) => r.studentId);

  if (absentStudentIds.length > 0) {
    void (async () => {
      try {
        const fullSession = await prisma.attendanceSession.findUnique({
          where: { id: sessionId },
          include: {
            subject: true,
            teacher: { include: { user: { select: { name: true } } } },
          },
        });

        const absentStudents = await prisma.student.findMany({
          where: { id: { in: absentStudentIds } },
          include: { user: { select: { name: true, email: true } } },
        });

        if (fullSession && absentStudents.length > 0) {
          const sessionDateStr = session.date.toISOString().slice(0, 10);
          const sessionInfo = {
            subjectName: fullSession.subject.name,
            subjectCode: fullSession.subject.code,
            date: sessionDateStr,
            period: fullSession.period,
            teacherName: fullSession.teacher.user.name,
          };

          const payload = absentStudents.map((st) => ({
            name: st.user.name,
            email: st.user.email,
            rollNo: st.rollNo,
          }));

          void sendAbsenteeEmailBatch(sessionInfo, payload);
        }
      } catch {
        // Safe background error ignore
      }
    })();
  }

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

// ─── Face Attendance Window & Check-in ─────────────────────────────

function computeEuclideanDistance(v1: number[], v2: number[]): number {
  if (!v1.length || !v2.length) return 1.0;
  let sum = 0;
  const len = Math.min(v1.length, v2.length);
  for (let i = 0; i < len; i++) {
    const diff = v1[i] - v2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

export async function startFaceWindow(sessionId: string, teacherUserId: number, durationMinutes: number = 5) {
  const session = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
    include: { section: true },
  });

  if (!session) {
    throw { code: 'NOT_FOUND', status: 404, message: 'Session not found' };
  }
  if (session.locked) {
    throw { code: 'SESSION_LOCKED', status: 400, message: 'Cannot start face window for a locked session' };
  }

  // Check section governance flag
  if (!session.section.isFaceAttendanceEnabled) {
    throw { code: 'FACE_DISABLED', status: 403, message: 'Face Attendance is disabled for this section by Admin.' };
  }

  const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

  return prisma.attendanceSession.update({
    where: { id: sessionId },
    data: {
      faceWindowActive: true,
      faceWindowExpiresAt: expiresAt,
    },
    include: {
      section: true,
      subject: true,
      records: {
        include: {
          student: {
            include: { user: { select: { name: true } } },
          },
        },
      },
    },
  });
}

export async function stopFaceWindow(sessionId: string, teacherUserId: number) {
  return prisma.attendanceSession.update({
    where: { id: sessionId },
    data: {
      faceWindowActive: false,
      faceWindowExpiresAt: null,
    },
    include: {
      section: true,
      subject: true,
    },
  });
}

export async function getActiveFaceSessionForStudent(studentUserId: number) {
  const student = await prisma.student.findUnique({
    where: { userId: studentUserId },
    select: { id: true, sectionId: true },
  });
  if (!student) return null;

  const now = new Date();
  const session = await prisma.attendanceSession.findFirst({
    where: {
      sectionId: student.sectionId,
      locked: false,
      faceWindowActive: true,
      faceWindowExpiresAt: { gt: now },
    },
    include: {
      subject: { select: { name: true, code: true } },
      teacher: { include: { user: { select: { name: true } } } },
      records: {
        where: { studentId: student.id },
        select: { id: true, status: true, method: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!session) return null;

  return {
    sessionId: session.id,
    subjectName: session.subject.name,
    subjectCode: session.subject.code,
    teacherName: session.teacher.user.name,
    expiresAt: session.faceWindowExpiresAt,
    alreadyMarked: session.records.length > 0,
    status: session.records[0]?.status || null,
  };
}

export async function faceCheckin(
  studentUserId: number,
  sessionId: string,
  clientDescriptor: number[],
  lat?: number,
  lng?: number
) {
  // 1. Check Session validity
  const session = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
    include: { section: true },
  });

  if (!session) {
    throw { code: 'NOT_FOUND', status: 404, message: 'Lecture session not found' };
  }
  if (session.locked) {
    throw { code: 'SESSION_LOCKED', status: 400, message: 'This attendance session is locked' };
  }
  if (!session.faceWindowActive || !session.faceWindowExpiresAt || new Date() > session.faceWindowExpiresAt) {
    throw { code: 'WINDOW_CLOSED', status: 400, message: 'Face attendance window has closed for this lecture' };
  }
  if (!session.section.isFaceAttendanceEnabled) {
    throw { code: 'FACE_DISABLED', status: 403, message: 'Face Attendance is disabled for this section by Admin' };
  }

  // 2. Geofence Verification
  if (lat !== undefined && lng !== undefined) {
    const inside = isWithinCampus(lat, lng);
    if (!inside) {
      throw { code: 'OUTSIDE_CAMPUS', status: 403, message: 'You must be inside college campus to mark attendance' };
    }
  }

  // 3. Find Student and Registered Face Descriptor
  const student = await prisma.student.findUnique({
    where: { userId: studentUserId },
    include: { user: { select: { name: true } } },
  });

  if (!student) {
    throw { code: 'NOT_STUDENT', status: 403, message: 'Student profile not found' };
  }
  if (student.sectionId !== session.sectionId) {
    throw { code: 'WRONG_SECTION', status: 403, message: 'You do not belong to this section' };
  }
  if (!student.faceDescriptor || student.faceDescriptor.length === 0) {
    throw { code: 'NO_FACE_ID', status: 400, message: 'Face ID not registered. Please register your Face ID in your Profile first.' };
  }

  // 4. Biometric Matching: Euclidean distance threshold (standard is 0.6)
  const distance = computeEuclideanDistance(clientDescriptor, student.faceDescriptor);
  const MATCH_THRESHOLD = 0.62;

  if (distance > MATCH_THRESHOLD) {
    throw {
      code: 'FACE_MISMATCH',
      status: 401,
      message: `Face verification failed. Confidence too low (${(1 - distance).toFixed(2)}). Ensure good lighting.`,
    };
  }

  // 5. Mark Attendance
  const record = await prisma.attendanceRecord.upsert({
    where: {
      sessionId_studentId: {
        sessionId,
        studentId: student.id,
      },
    },
    create: {
      sessionId,
      studentId: student.id,
      status: 'P' as AttendanceStatus,
      method: 'FACE' as MarkingMethod,
      clientTs: new Date(),
    },
    update: {
      status: 'P' as AttendanceStatus,
      method: 'FACE' as MarkingMethod,
      clientTs: new Date(),
    },
  });

  return {
    success: true,
    studentName: student.user.name,
    rollNo: student.rollNo,
    status: record.status,
    method: record.method,
    confidence: Math.round((1 - distance) * 100),
  };
}
