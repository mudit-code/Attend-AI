import { prisma } from '../../lib/prisma';
import type { UpdateRulesInput } from './schema';

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

// ─── System Stats ─────────────────────────────────────────────────
export async function getSystemStats() {
  const [totalStudents, totalTeachers, totalCourses, totalSessions, totalLeaves] = await Promise.all([
    prisma.student.count(),
    prisma.teacher.count(),
    prisma.course.count(),
    prisma.attendanceSession.count(),
    prisma.leaveRequest.count(),
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
  };
}
