import { prisma } from '../../lib/prisma';
import type { UpdateRulesInput } from './schema';
import { getDefaulters } from '../reports/service';

// ─── Attendance Rules ─────────────────────────────────────────────
export async function getRules() {
  let rules = await prisma.attendanceRule.findFirst();
  if (!rules) {
    rules = await prisma.attendanceRule.create({
      data: {
        minPercent: 75,
        lateGraceMinutes: 10,
        editWindowHours: 24,
        countLeaveAsPresent: false,
      },
    });
  }
  return rules;
}

export async function updateRules(userId: number, input: UpdateRulesInput, clientIp?: string) {
  const current = await getRules();

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.attendanceRule.update({
      where: { id: current.id },
      data: input,
    });

    await tx.auditLog.create({
      data: {
        userId,
        action: 'update_rules',
        entity: 'attendance_rules',
        entityId: current.id.toString(),
        oldValue: current as any,
        newValue: input as any,
        ip: clientIp,
      },
    });

    return res;
  });

  return updated;
}

// ─── Audit Logs ───────────────────────────────────────────────────
export async function getAuditLogs(entity?: string, limit = 50) {
  const logs = await prisma.auditLog.findMany({
    where: entity ? { entity } : undefined,
    include: {
      user: { select: { id: true, name: true, role: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  // Convert BigInt to string for JSON serialization
  return logs.map((l) => ({
    ...l,
    id: l.id.toString(),
  }));
}

// ─── Device Management ───────────────────────────────────────────
export async function getDeviceByRollNo(rollNo: string) {
  const cleanRollNo = rollNo.trim();
  const student = await prisma.student.findFirst({
    where: { rollNo: { equals: cleanRollNo, mode: 'insensitive' } },
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true },
        include: { devices: true },
      },
    },
  });

  if (!student) {
    throw { code: 'NOT_FOUND', status: 404, message: `Student with Roll No '${rollNo}' not found` };
  }

  return {
    studentId: student.id,
    rollNo: student.rollNo,
    name: student.user.name,
    email: student.user.email,
    devices: student.user.devices,
  };
}

export async function unbindStudentDevice(rollNo: string, adminUserId: number, clientIp?: string) {
  const cleanRollNo = rollNo.trim();
  const student = await prisma.student.findFirst({
    where: { rollNo: { equals: cleanRollNo, mode: 'insensitive' } },
    include: { user: { include: { devices: true } } },
  });

  if (!student) {
    throw { code: 'NOT_FOUND', status: 404, message: `Student with Roll No '${rollNo}' not found` };
  }

  const deviceCount = student.user.devices.length;
  if (deviceCount === 0) {
    throw { code: 'NO_DEVICE', status: 409, message: 'No device is currently bound to this student account' };
  }

  const oldDevices = student.user.devices.map((d) => ({ deviceId: d.deviceId, platform: d.platform }));

  await prisma.$transaction(async (tx) => {
    await tx.device.deleteMany({ where: { userId: student.userId } });

    await tx.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'admin_device_unbind',
        entity: 'device',
        entityId: student.userId.toString(),
        oldValue: { devices: oldDevices, rollNo },
        newValue: { devices: [], rollNo, resetBy: adminUserId },
        ip: clientIp,
      },
    });
  });

  return { success: true, rollNo, unbound: deviceCount };
}

// ─── Locked Session Unlock Requests ───────────────────────────────
export async function getLockedSessions(limit = 30) {
  const sessions = await prisma.attendanceSession.findMany({
    where: { locked: true },
    include: {
      teacher: { include: { user: { select: { name: true, email: true } } } },
      section: { select: { name: true } },
      subject: { select: { name: true, code: true } },
      _count: { select: { records: true } },
    },
    orderBy: { lockedAt: 'desc' },
    take: limit,
  });

  return sessions.map((s) => ({
    id: s.id,
    date: s.date,
    period: s.period,
    lockedAt: s.lockedAt,
    teacherName: s.teacher.user.name,
    teacherEmail: s.teacher.user.email,
    sectionName: s.section.name,
    subjectName: s.subject.name,
    subjectCode: s.subject.code,
    recordCount: s._count.records,
  }));
}

export async function adminUnlockSession(
  sessionId: string,
  adminUserId: number,
  reason: string,
  clientIp?: string
) {
  const session = await prisma.attendanceSession.findUnique({ where: { id: sessionId } });
  if (!session) {
    throw { code: 'NOT_FOUND', status: 404, message: 'Attendance session not found' };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.attendanceSession.update({
      where: { id: sessionId },
      data: { locked: false, lockedAt: null },
    });

    await tx.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'admin_unlock_session',
        entity: 'attendance_session',
        entityId: sessionId,
        oldValue: { locked: true, lockedAt: session.lockedAt },
        newValue: { locked: false, reason, unlockedBy: adminUserId },
        ip: clientIp,
      },
    });

    return res;
  });

  return updated;
}

// ─── System Stats ─────────────────────────────────────────────────
export async function getSystemStats() {
  const [totalStudents, totalTeachers, totalCourses, totalSessions, totalLeaves, defaultersRes] = await Promise.all([
    prisma.student.count(),
    prisma.teacher.count(),
    prisma.course.count(),
    prisma.attendanceSession.count(),
    prisma.leaveRequest.count(),
    getDefaulters(75).catch(() => ({ totalDefaulters: 0 })),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todaySessions = await prisma.attendanceSession.count({
    where: { date: { gte: today } },
  });

  return {
    totalStudents,
    totalTeachers,
    totalCourses,
    totalSessions,
    totalLeaves,
    todaySessions,
    defaultersCount: defaultersRes.totalDefaulters,
  };
}
