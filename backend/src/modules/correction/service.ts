import { prisma } from '../../lib/prisma';
import type { CreateCorrectionInput, DecideCorrectionInput } from './schema';

// ─── Create Correction Request ────────────────────────────────────
export async function createCorrectionRequest(userId: number, input: CreateCorrectionInput) {
  const student = await prisma.student.findUnique({
    where: { userId },
  });

  if (!student) {
    throw { code: 'NOT_STUDENT', status: 403, message: 'Only students can submit correction requests' };
  }

  // Verify session exists
  const session = await prisma.attendanceSession.findUnique({
    where: { id: input.sessionId },
  });

  if (!session) {
    throw { code: 'SESSION_NOT_FOUND', status: 404, message: 'Attendance session not found' };
  }

  // Check if existing pending correction for this session
  const existing = await prisma.correctionRequest.findUnique({
    where: {
      studentId_sessionId: {
        studentId: student.id,
        sessionId: input.sessionId,
      },
    },
  });

  if (existing && existing.status === 'PENDING') {
    throw { code: 'PENDING_EXISTS', status: 400, message: 'A correction request is already pending for this class' };
  }

  return prisma.correctionRequest.upsert({
    where: {
      studentId_sessionId: {
        studentId: student.id,
        sessionId: input.sessionId,
      },
    },
    update: {
      requestedStatus: input.requestedStatus,
      reason: input.reason,
      documentUrl: input.documentUrl,
      status: 'PENDING',
      decidedBy: null,
      decisionNote: null,
      decidedAt: null,
    },
    create: {
      studentId: student.id,
      sessionId: input.sessionId,
      requestedStatus: input.requestedStatus,
      reason: input.reason,
      documentUrl: input.documentUrl,
    },
    include: {
      session: { include: { subject: true } },
    },
  });
}

// ─── List Correction Requests ─────────────────────────────────────
export async function getCorrectionRequests(userId: number, role: string, status?: string) {
  if (role === 'STUDENT') {
    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) return [];
    return prisma.correctionRequest.findMany({
      where: {
        studentId: student.id,
        ...(status ? { status: status as any } : {}),
      },
      include: {
        session: { include: { subject: true, teacher: { include: { user: { select: { name: true } } } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  return prisma.correctionRequest.findMany({
    where: status ? { status: status as any } : undefined,
    include: {
      student: {
        include: {
          user: { select: { name: true, email: true } },
          section: true,
        },
      },
      session: {
        include: {
          subject: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

// ─── Decide Correction Request ────────────────────────────────────
export async function decideCorrectionRequest(
  id: string,
  deciderUserId: number,
  input: DecideCorrectionInput,
  clientIp?: string
) {
  const req = await prisma.correctionRequest.findUnique({
    where: { id },
  });

  if (!req) {
    throw { code: 'NOT_FOUND', status: 404, message: 'Correction request not found' };
  }

  if (req.status !== 'PENDING') {
    throw { code: 'ALREADY_DECIDED', status: 400, message: `Request has already been ${req.status.toLowerCase()}` };
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.correctionRequest.update({
      where: { id },
      data: {
        status: input.decision,
        decidedBy: deciderUserId,
        decisionNote: input.note,
        decidedAt: new Date(),
      },
    });

    if (input.decision === 'APPROVED') {
      // Update attendance record
      await tx.attendanceRecord.upsert({
        where: {
          sessionId_studentId: {
            sessionId: req.sessionId,
            studentId: req.studentId,
          },
        },
        update: {
          status: req.requestedStatus,
          receivedAt: new Date(),
        },
        create: {
          sessionId: req.sessionId,
          studentId: req.studentId,
          status: req.requestedStatus,
          clientTs: new Date(),
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: deciderUserId,
          action: 'approve_correction',
          entity: 'correction_request',
          entityId: id,
          newValue: { status: req.requestedStatus, note: input.note },
          ip: clientIp,
        },
      });
    }

    return updated;
  });
}
