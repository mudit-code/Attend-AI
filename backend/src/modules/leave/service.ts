import { prisma } from '../../lib/prisma';
import type { AttendanceStatus } from '@prisma/client';
import type { CreateLeaveInput, DecideLeaveInput } from './schema';

// ─── Create Leave Request ─────────────────────────────────────────
export async function createLeaveRequest(userId: number, input: CreateLeaveInput) {
  const student = await prisma.student.findUnique({
    where: { userId },
  });

  if (!student) {
    throw { code: 'NOT_STUDENT', status: 403, message: 'Only students can submit leave requests' };
  }

  const fromDate = new Date(`${input.fromDate}T00:00:00.000Z`);
  const toDate = new Date(`${input.toDate}T23:59:59.999Z`);

  if (fromDate > toDate) {
    throw { code: 'INVALID_DATES', status: 400, message: 'fromDate cannot be after toDate' };
  }

  return prisma.leaveRequest.create({
    data: {
      studentId: student.id,
      fromDate,
      toDate,
      type: input.type,
      reason: input.reason,
      documentUrl: input.documentUrl,
    },
    include: {
      student: { include: { user: { select: { name: true } } } },
    },
  });
}

// ─── List Leave Requests ──────────────────────────────────────────
export async function getLeaveRequests(userId: number, role: string, status?: string) {
  if (role === 'STUDENT') {
    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) return [];
    return prisma.leaveRequest.findMany({
      where: {
        studentId: student.id,
        ...(status ? { status: status as any } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Teacher / HOD / Admin sees leaves
  return prisma.leaveRequest.findMany({
    where: status ? { status: status as any } : undefined,
    include: {
      student: {
        include: {
          user: { select: { name: true, email: true } },
          section: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

// ─── Decide Leave Request ─────────────────────────────────────────
export async function decideLeaveRequest(
  leaveId: string,
  deciderUserId: number,
  input: DecideLeaveInput
) {
  const leave = await prisma.leaveRequest.findUnique({
    where: { id: leaveId },
    include: { student: true },
  });

  if (!leave) {
    throw { code: 'NOT_FOUND', status: 404, message: 'Leave request not found' };
  }

  if (leave.status !== 'PENDING') {
    throw { code: 'ALREADY_DECIDED', status: 400, message: `Leave has already been ${leave.status.toLowerCase()}` };
  }

  return prisma.$transaction(async (tx) => {
    const updatedLeave = await tx.leaveRequest.update({
      where: { id: leaveId },
      data: {
        status: input.decision,
        decidedBy: deciderUserId,
        decisionNote: input.note,
        decidedAt: new Date(),
      },
    });

    // If approved, update existing attendance records in this date range to LV or OD
    if (input.decision === 'APPROVED') {
      const targetStatus: AttendanceStatus = leave.type === 'OD' ? 'OD' : 'LV';

      // Find sessions in date range
      const sessions = await tx.attendanceSession.findMany({
        where: {
          date: { gte: leave.fromDate, lte: leave.toDate },
          sectionId: leave.student.sectionId,
        },
        select: { id: true },
      });

      const sessionIds = sessions.map((s) => s.id);

      if (sessionIds.length > 0) {
        await tx.attendanceRecord.updateMany({
          where: {
            studentId: leave.studentId,
            sessionId: { in: sessionIds },
          },
          data: {
            status: targetStatus,
          },
        });
      }
    }

    // Audit log
    await tx.auditLog.create({
      data: {
        userId: deciderUserId,
        action: 'decide_leave',
        entity: 'leave_request',
        entityId: leaveId,
        newValue: { status: input.decision, note: input.note },
      },
    });

    return updatedLeave;
  });
}
