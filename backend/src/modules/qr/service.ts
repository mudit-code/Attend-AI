import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import type { StartQrInput, MarkQrInput } from './schema';

const QR_WINDOW_SECONDS = 10;

// Helper to compute token for a given time window
function computeToken(sessionId: string, windowNumber: number): string {
  return crypto
    .createHmac('sha256', env.JWT_SECRET)
    .update(`${sessionId}:${windowNumber}`)
    .digest('hex')
    .substring(0, 8)
    .toUpperCase();
}

// ─── Generate Current QR Token ────────────────────────────────────
export function getCurrentToken(sessionId: string) {
  const currentWindow = Math.floor(Date.now() / 1000 / QR_WINDOW_SECONDS);
  const token = computeToken(sessionId, currentWindow);
  const secondsRemaining = QR_WINDOW_SECONDS - (Math.floor(Date.now() / 1000) % QR_WINDOW_SECONDS);

  return {
    token,
    windowSeconds: QR_WINDOW_SECONDS,
    secondsRemaining,
  };
}

// ─── Mark Attendance via QR ───────────────────────────────────────
export async function markQrAttendance(userId: number, input: MarkQrInput) {
  // 1. Verify session
  const session = await prisma.attendanceSession.findUnique({
    where: { id: input.sessionId },
  });

  if (!session) {
    throw { code: 'SESSION_NOT_FOUND', status: 404, message: 'Attendance session not found' };
  }

  if (session.locked) {
    throw { code: 'SESSION_LOCKED', status: 403, message: 'Session is locked' };
  }

  // 2. Verify token against current or previous window (tolerance for network delay)
  const currentWindow = Math.floor(Date.now() / 1000 / QR_WINDOW_SECONDS);
  const validCurrent = computeToken(input.sessionId, currentWindow);
  const validPrev = computeToken(input.sessionId, currentWindow - 1);

  if (input.token !== validCurrent && input.token !== validPrev) {
    throw { code: 'INVALID_TOKEN', status: 400, message: 'QR token has expired or is invalid. Please scan again.' };
  }

  // 3. Find student profile
  const student = await prisma.student.findUnique({
    where: { userId },
  });

  if (!student) {
    throw { code: 'NOT_STUDENT', status: 403, message: 'User is not registered as a student' };
  }

  // 4. Verify student belongs to the section
  if (student.sectionId !== session.sectionId) {
    throw { code: 'WRONG_SECTION', status: 403, message: 'You are not enrolled in this section' };
  }

  // 5. Device binding check
  const existingDevice = await prisma.device.findFirst({
    where: { userId },
  });

  if (!existingDevice) {
    // Check if this deviceId was previously attached to a different account in testing
    const conflictDevice = await prisma.device.findUnique({
      where: { deviceId: input.deviceId },
    });
    if (conflictDevice && conflictDevice.userId !== userId) {
      await prisma.device.delete({
        where: { id: conflictDevice.id },
      });
    }

    // First device: auto-bind
    await prisma.device.create({
      data: {
        userId,
        deviceId: input.deviceId,
        platform: 'web',
        lastSyncAt: new Date(),
      },
    });
  } else if (existingDevice.deviceId !== input.deviceId) {
    throw {
      code: 'DEVICE_MISMATCH',
      status: 403,
      message: 'Account bound to another device. Contact HOD to reset device binding.',
    };
  }

  // 6. Record attendance
  const record = await prisma.attendanceRecord.upsert({
    where: {
      sessionId_studentId: {
        sessionId: session.id,
        studentId: student.id,
      },
    },
    update: {
      status: 'P',
      method: 'QR',
      clientTs: new Date(),
      receivedAt: new Date(),
    },
    create: {
      sessionId: session.id,
      studentId: student.id,
      status: 'P',
      method: 'QR',
      clientTs: new Date(),
    },
  });

  // 7. Change log for offline sync pull
  await prisma.changeLog.create({
    data: {
      entity: 'attendance',
      entityId: record.id,
      op: 'upsert',
      sectionId: session.sectionId,
    },
  });

  // 8. Audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'mark_attendance_qr',
      entity: 'attendance_record',
      entityId: record.id,
      newValue: { status: 'P', method: 'QR', deviceId: input.deviceId },
    },
  });

  return { success: true, record };
}
