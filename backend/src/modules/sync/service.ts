import { prisma } from '../../lib/prisma';
import type { AttendanceStatus, MarkingMethod } from '@prisma/client';
import type { PushBatchInput, PushBatchItem } from './schema';

// ─── Bootstrap ────────────────────────────────────────────────────
// Teacher or Student calls this on app launch / login to get full initial local DB
export async function bootstrap(userId: number, role: string) {
  const currentAcademicYear = await prisma.academicYear.findFirst({
    where: { isCurrent: true },
  });

  const rules = await prisma.attendanceRule.findFirst();

  let teacherSubjects: any[] = [];
  let sectionIds: number[] = [];

  if (role === 'TEACHER') {
    const teacher = await prisma.teacher.findUnique({
      where: { userId },
      include: {
        subjects: {
          include: {
            subject: true,
            section: true,
          },
        },
      },
    });

    if (teacher) {
      teacherSubjects = teacher.subjects;
      sectionIds = teacher.subjects.map((ts) => ts.sectionId);
    }
  } else if (role === 'STUDENT') {
    const student = await prisma.student.findUnique({
      where: { userId },
      include: { section: true },
    });
    if (student) {
      sectionIds = [student.sectionId];
    }
  } else {
    // Admin / HOD gets all
    const allSections = await prisma.section.findMany({ select: { id: true } });
    sectionIds = allSections.map((s) => s.id);
  }

  const sections = await prisma.section.findMany({
    where: sectionIds.length > 0 ? { id: { in: sectionIds } } : undefined,
    include: { course: { include: { department: true } } },
  });

  // Enrich sections with flat fields for fast frontend lookup
  const enrichedSections = sections.map((s) => ({
    id: s.id,
    name: s.name,
    year: s.year,
    courseId: s.courseId,
    courseName: s.course.name,
    courseCode: s.course.code,
    departmentId: s.course.departmentId,
    departmentName: s.course.department.name,
  }));

  const subjects = await prisma.subject.findMany();

  const students = await prisma.student.findMany({
    where: sectionIds.length > 0 ? { sectionId: { in: sectionIds } } : undefined,
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
    },
    orderBy: { rollNo: 'asc' },
  });

  const timetable = await prisma.timetableSlot.findMany({
    where: sectionIds.length > 0 ? { sectionId: { in: sectionIds } } : undefined,
  });

  const holidays = await prisma.holiday.findMany({
    orderBy: { date: 'asc' },
  });

  // Current max change sequence
  const latestChange = await prisma.changeLog.findFirst({
    orderBy: { changeSeq: 'desc' },
  });
  const currentCursor = latestChange ? latestChange.changeSeq.toString() : '0';

  return {
    academicYear: currentAcademicYear,
    rules: rules || { minPercent: 75, lateGraceMinutes: 10, editWindowHours: 24, countLeaveAsPresent: false },
    sections: enrichedSections,
    subjects,
    teacherSubjects,
    students,
    timetable,
    holidays,
    cursor: currentCursor,
    bootstrappedAt: new Date().toISOString(),
  };
}

// ─── Push Batch ───────────────────────────────────────────────────
export async function pushBatch(userId: number, input: PushBatchInput, clientIp?: string) {
  const results: {
    clientMutationId: string;
    status: 'accepted' | 'duplicate' | 'rejected' | 'conflict';
    error?: string;
  }[] = [];

  for (const item of input.items) {
    try {
      if (item.entity === 'attendance') {
        const res = await processAttendanceMutation(userId, item, clientIp);
        results.push(res);
      } else {
        results.push({
          clientMutationId: item.clientMutationId,
          status: 'accepted',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Processing error';
      results.push({
        clientMutationId: item.clientMutationId,
        status: 'rejected',
        error: msg,
      });
    }
  }

  return { batchId: input.batchId, results };
}

async function processAttendanceMutation(
  userId: number,
  item: PushBatchItem,
  clientIp?: string
): Promise<{ clientMutationId: string; status: 'accepted' | 'duplicate' | 'rejected' | 'conflict'; error?: string }> {
  const p = item.payload;

  // p contains: sessionId (or sectionId, subjectId, date, period), studentId, status, method, clientTs
  let sessionId = p.sessionId as string | undefined;

  if (!sessionId && p.sectionId && p.subjectId && p.date && p.period) {
    const sessionDate = new Date(`${p.date}T00:00:00.000Z`);
    // Find or create session
    let teacherId = p.teacherId as number;
    if (!teacherId) {
      const teacher = await prisma.teacher.findUnique({ where: { userId } });
      teacherId = teacher?.id || 1;
    }

    const session = await prisma.attendanceSession.upsert({
      where: {
        sectionId_subjectId_date_period: {
          sectionId: Number(p.sectionId),
          subjectId: Number(p.subjectId),
          date: sessionDate,
          period: Number(p.period),
        },
      },
      update: {},
      create: {
        teacherId,
        sectionId: Number(p.sectionId),
        subjectId: Number(p.subjectId),
        date: sessionDate,
        period: Number(p.period),
      },
    });
    sessionId = session.id;
  }

  if (!sessionId) {
    return { clientMutationId: item.clientMutationId, status: 'rejected', error: 'Missing sessionId or session details' };
  }

  const session = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    return { clientMutationId: item.clientMutationId, status: 'rejected', error: 'Session not found' };
  }

  if (session.locked) {
    return { clientMutationId: item.clientMutationId, status: 'rejected', error: 'Session is locked' };
  }

  const studentId = Number(p.studentId);
  const status = p.status as AttendanceStatus;
  const method = (p.method as MarkingMethod) || 'MANUAL';
  const clientTs = p.clientTs ? new Date(p.clientTs) : new Date();

  // Check if identical record already exists (duplicate check for idempotency)
  const existingRecord = await prisma.attendanceRecord.findUnique({
    where: {
      sessionId_studentId: { sessionId, studentId },
    },
  });

  if (existingRecord && existingRecord.status === status && existingRecord.method === method) {
    return { clientMutationId: item.clientMutationId, status: 'duplicate' };
  }

  // Upsert record
  const record = await prisma.attendanceRecord.upsert({
    where: {
      sessionId_studentId: { sessionId, studentId },
    },
    update: {
      status,
      method,
      clientTs,
      receivedAt: new Date(),
    },
    create: {
      sessionId,
      studentId,
      status,
      method,
      clientTs,
    },
  });

  // Log to change_log for incremental pull
  await prisma.changeLog.create({
    data: {
      entity: 'attendance',
      entityId: record.id,
      op: 'upsert',
      sectionId: session.sectionId,
    },
  });

  // Append-only audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'sync_push_record',
      entity: 'attendance_record',
      entityId: record.id,
      newValue: { status, method, clientMutationId: item.clientMutationId },
      ip: clientIp,
    },
  });

  return { clientMutationId: item.clientMutationId, status: 'accepted' };
}

// ─── Pull Changes ─────────────────────────────────────────────────
export async function pullChanges(cursor: bigint, sectionId?: number) {
  const changes = await prisma.changeLog.findMany({
    where: {
      changeSeq: { gt: cursor },
      ...(sectionId ? { sectionId } : {}),
    },
    orderBy: { changeSeq: 'asc' },
    take: 100,
  });

  const nextCursor = changes.length > 0 ? changes[changes.length - 1].changeSeq.toString() : cursor.toString();

  // Enrich changes with actual entity data for IndexedDB client storage
  const serializedChanges = await Promise.all(
    changes.map(async (c) => {
      let data: any = null;
      if (c.op === 'upsert') {
        const numId = parseInt(c.entityId, 10);
        try {
          if (c.entity === 'student' && !isNaN(numId)) {
            data = await prisma.student.findUnique({
              where: { id: numId },
              include: { user: { select: { name: true, email: true } } },
            });
          } else if (c.entity === 'section' && !isNaN(numId)) {
            data = await prisma.section.findUnique({ where: { id: numId } });
          } else if (c.entity === 'subject' && !isNaN(numId)) {
            data = await prisma.subject.findUnique({ where: { id: numId } });
          } else if (c.entity === 'timetable' && !isNaN(numId)) {
            data = await prisma.timetableSlot.findUnique({ where: { id: numId } });
          } else if (c.entity === 'attendance') {
            data = await prisma.attendanceRecord.findUnique({ where: { id: c.entityId } });
          }
        } catch {
          // If entity was modified or unavailable, omit data payload gracefully
        }
      }

      return {
        changeSeq: c.changeSeq.toString(),
        entity: c.entity,
        entityId: c.entityId,
        id: c.entityId,
        op: c.op,
        sectionId: c.sectionId,
        createdAt: c.createdAt,
        data,
      };
    })
  );

  return {
    changes: serializedChanges,
    nextCursor,
    hasMore: changes.length === 100,
  };
}
