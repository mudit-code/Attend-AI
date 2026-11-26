import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { GatePassError } from './errors';

// ─── Helper: SHA-256 hash ──────────────────────────────────────────
function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

// ─── Helper: Current day-of-week (1=Mon...7=Sun, matching TimetableSlot) ──
function currentDayOfWeek(): number {
  const jsDay = new Date().getDay(); // 0=Sun
  return jsDay === 0 ? 7 : jsDay;
}

// ─── Helper: Current time as "HH:MM" ───────────────────────────────
function currentTimeStr(): string {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

// ─── MENTOR DETECTION (Priority Chain) ─────────────────────────────
export async function detectMentor(studentId: number): Promise<{ teacherId: number; method: string }> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { sectionId: true },
  });
  if (!student) throw new GatePassError(404, 'STUDENT_NOT_FOUND', 'Student not found');

  const { sectionId } = student;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  // Priority 1: Active (unlocked) AttendanceSession today
  const liveSession = await prisma.attendanceSession.findFirst({
    where: {
      sectionId,
      date: { gte: today, lte: todayEnd },
      locked: false,
    },
    orderBy: { createdAt: 'desc' },
    select: { teacherId: true },
  });
  if (liveSession) return { teacherId: liveSession.teacherId, method: 'LIVE_SESSION' };

  // Priority 2 & 3: TimetableSlot
  const dayOfWeek = currentDayOfWeek();
  const timeNow = currentTimeStr();

  const slots = await prisma.timetableSlot.findMany({
    where: { sectionId, dayOfWeek },
    orderBy: { period: 'asc' },
    select: { teacherId: true, startTime: true, endTime: true },
  });

  // P2: slot where current time is within startTime-endTime
  const currentSlot = slots.find((s: { teacherId: number; startTime: string; endTime: string }) => s.startTime <= timeNow && timeNow <= s.endTime);
  if (currentSlot) return { teacherId: currentSlot.teacherId, method: 'TIMETABLE_CURRENT' };

  // P3: First slot of today
  if (slots.length > 0) return { teacherId: slots[0].teacherId, method: 'TIMETABLE_FIRST' };

  // Priority 4: Class teacher
  const classTeacher = await prisma.teacher.findFirst({
    where: { isClassTeacher: true, classTeacherSectionId: sectionId },
    select: { id: true },
  });
  if (classTeacher) return { teacherId: classTeacher.id, method: 'CLASS_TEACHER' };

  throw new GatePassError(422, 'NO_MENTOR_FOUND', 'No teacher could be assigned as mentor right now. Please contact admin.');
}

// ─── STUDENT: Apply for Gate Pass ───────────────────────────────────
export async function applyGatePass(userId: number, body: {
  reason: string;
  reasonOther?: string;
  destination: string;
  additionalNote?: string;
  documentUrl?: string;
  outTime: string;
  expectedInTime: string;
}) {
  const student = await prisma.student.findUnique({ where: { userId }, select: { id: true } });
  if (!student) throw new GatePassError(403, 'NOT_A_STUDENT', 'Only students can apply for gate pass');

  // Check no existing pending pass
  const existing = await prisma.gatePass.findFirst({
    where: {
      studentId: student.id,
      mentorStatus: 'PENDING',
    },
  });
  if (existing) throw new GatePassError(409, 'ALREADY_PENDING', 'You already have a pending gate pass application');

  const { teacherId, method } = await detectMentor(student.id);

  const pass = await prisma.gatePass.create({
    data: {
      studentId: student.id,
      reason: body.reason as any,
      reasonOther: body.reasonOther,
      destination: body.destination,
      additionalNote: body.additionalNote,
      documentUrl: body.documentUrl || null,
      outTime: new Date(body.outTime),
      expectedInTime: new Date(body.expectedInTime),
      mentorTeacherId: teacherId,
      mentorAssignMethod: method,
      mentorStatus: 'PENDING',
      hodStatus: 'PENDING',
    },
    include: {
      student: { include: { user: { select: { name: true } } } },
      mentor: { include: { user: { select: { name: true } } } },
    },
  });

  return pass;
}

// ─── STUDENT: Get My Passes ─────────────────────────────────────────
export async function getMyPasses(userId: number) {
  const student = await prisma.student.findUnique({ where: { userId }, select: { id: true } });
  if (!student) throw new GatePassError(403, 'NOT_A_STUDENT', 'Only students can view passes');

  return prisma.gatePass.findMany({
    where: { studentId: student.id },
    orderBy: { createdAt: 'desc' },
    include: {
      mentor: { include: { user: { select: { name: true } } } },
    },
  });
}

// ─── STUDENT: Get QR token info for approved pass ─────────────────
export async function getMyQr(userId: number, passId: string) {
  const student = await prisma.student.findUnique({ where: { userId }, select: { id: true } });
  if (!student) throw new GatePassError(403, 'NOT_A_STUDENT', 'Only students can view QR');

  const pass = await prisma.gatePass.findFirst({
    where: { id: passId, studentId: student.id },
    include: {
      student: {
        include: {
          user: { select: { name: true } },
          section: { include: { course: { include: { department: { select: { name: true } } } } } },
        },
      },
    },
  });
  if (!pass) throw new GatePassError(404, 'PASS_NOT_FOUND', 'Gate pass not found');
  if (pass.mentorStatus !== 'APPROVED' || pass.hodStatus !== 'APPROVED')
    throw new GatePassError(403, 'NOT_APPROVED', 'Gate pass is not fully approved yet');
  if (!pass.qrTokenHash) throw new GatePassError(404, 'QR_NOT_GENERATED', 'QR code not generated yet');
  if (pass.qrConsumedAt) throw new GatePassError(410, 'QR_CONSUMED', 'This QR code has already been used');
  if (pass.qrExpiresAt && new Date() > pass.qrExpiresAt)
    throw new GatePassError(410, 'QR_EXPIRED', 'This QR code has expired');

  const token = createSignedPassToken({
    pid: pass.id,
    roll: pass.student.rollNo,
    name: pass.student.user.name,
    dept: pass.student.section.course.department.name,
    dest: pass.destination,
    out: pass.outTime.toISOString(),
    exp: pass.expectedInTime.toISOString(),
    validUntil: (pass.qrExpiresAt || new Date(pass.outTime.getTime() + 30 * 60 * 1000)).toISOString(),
    nonce: pass.id,
  });

  return {
    passId: pass.id,
    token,
    destination: pass.destination,
    outTime: pass.outTime,
    expectedInTime: pass.expectedInTime,
    qrExpiresAt: pass.qrExpiresAt,
  };
}

// ─── TEACHER: Get Mentor Queue ──────────────────────────────────────
export async function getMentorQueue(userId: number) {
  const teacher = await prisma.teacher.findUnique({ where: { userId }, select: { id: true } });
  if (!teacher) throw new GatePassError(403, 'NOT_A_TEACHER', 'Only teachers can view mentor queue');

  return prisma.gatePass.findMany({
    where: { mentorTeacherId: teacher.id, mentorStatus: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    include: {
      student: {
        include: {
          user: { select: { name: true } },
          section: { include: { course: { include: { department: { select: { name: true } } } } } },
        },
      },
    },
  });
}

// ─── TEACHER: Mentor Decision ───────────────────────────────────────
export async function mentorDecide(userId: number, passId: string, decision: { status: 'APPROVED' | 'REJECTED'; note?: string }) {
  const teacher = await prisma.teacher.findUnique({ where: { userId }, select: { id: true } });
  if (!teacher) throw new GatePassError(403, 'NOT_A_TEACHER', 'Only teachers can decide on gate pass');

  const pass = await prisma.gatePass.findFirst({
    where: { id: passId, mentorTeacherId: teacher.id },
  });
  if (!pass) throw new GatePassError(404, 'PASS_NOT_FOUND', 'Gate pass not found or not assigned to you');
  if (pass.mentorStatus !== 'PENDING') throw new GatePassError(409, 'ALREADY_DECIDED', 'Already decided on this pass');

  return prisma.gatePass.update({
    where: { id: passId },
    data: {
      mentorStatus: decision.status as any,
      mentorNote: decision.note,
      mentorDecidedAt: new Date(),
    },
  });
}

// ─── HOD/ADMIN: Get HOD Queue ───────────────────────────────────────
export async function getHodQueue() {
  return prisma.gatePass.findMany({
    where: { mentorStatus: 'APPROVED', hodStatus: 'PENDING' },
    orderBy: { mentorDecidedAt: 'asc' },
    include: {
      student: {
        include: {
          user: { select: { name: true } },
          section: { include: { course: { include: { department: { select: { name: true } } } } } },
        },
      },
      mentor: { include: { user: { select: { name: true } } } },
    },
  });
}

// ─── Helper: Create Signed Pass Token (For Offline Guard Verification) ──
const GATEPASS_SECRET = process.env.GATEPASS_SIGNING_KEY || process.env.JWT_SECRET || 'attendai_gatepass_secure_offline_key_2026';

export function createSignedPassToken(payload: {
  pid: string;
  roll: string;
  name: string;
  dept: string;
  dest: string;
  out: string;
  exp: string;
  validUntil: string;
  nonce: string;
}): string {
  const payloadStr = JSON.stringify(payload);
  const payloadB64 = Buffer.from(payloadStr).toString('base64url');
  const signature = crypto.createHmac('sha256', GATEPASS_SECRET).update(payloadB64).digest('hex');
  return `${payloadB64}.${signature}`;
}

// ─── HOD/ADMIN: HOD Final Decision ─────────────────────────────────
export async function hodDecide(passId: string, decision: { status: 'APPROVED' | 'REJECTED'; note?: string }) {
  const pass = await prisma.gatePass.findFirst({
    where: { id: passId, mentorStatus: 'APPROVED', hodStatus: 'PENDING' },
    include: {
      student: {
        include: {
          user: { select: { name: true } },
          section: { include: { course: { include: { department: { select: { name: true } } } } } },
        },
      },
    },
  });
  if (!pass) throw new GatePassError(404, 'PASS_NOT_FOUND', 'Pass not found or not in correct state');

  if (decision.status === 'APPROVED') {
    const expiresAt = new Date(pass.outTime.getTime() + 30 * 60 * 1000);
    const signedToken = createSignedPassToken({
      pid: pass.id,
      roll: pass.student.rollNo,
      name: pass.student.user.name,
      dept: pass.student.section.course.department.name,
      dest: pass.destination,
      out: pass.outTime.toISOString(),
      exp: pass.expectedInTime.toISOString(),
      validUntil: expiresAt.toISOString(),
      nonce: pass.id,
    });

    const tokenHash = sha256(signedToken);

    const updated = await prisma.gatePass.update({
      where: { id: passId },
      data: {
        hodStatus: 'APPROVED',
        hodNote: decision.note,
        hodDecidedAt: new Date(),
        qrTokenHash: tokenHash,
        qrExpiresAt: expiresAt,
      },
    });
    return { ...updated, rawToken: signedToken };
  }

  return prisma.gatePass.update({
    where: { id: passId },
    data: {
      hodStatus: 'REJECTED',
      hodNote: decision.note,
      hodDecidedAt: new Date(),
    },
  });
}

// ─── GUARD: Scan QR Token (Supports both Online Token & Signed Token) ──
export async function guardScan(rawToken: string) {
  let tokenHash = sha256(rawToken);

  let pass = await prisma.gatePass.findFirst({
    where: { qrTokenHash: tokenHash },
    include: {
      student: {
        include: {
          user: { select: { name: true } },
          section: { include: { course: { include: { department: { select: { name: true } } } } } },
        },
      },
    },
  });

  // Backward compatibility: If signed token format, try payload nonce hash
  if (!pass && rawToken.includes('.')) {
    try {
      const [payloadB64] = rawToken.split('.');
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
      if (payload.nonce) {
        pass = await prisma.gatePass.findFirst({
          where: { qrTokenHash: sha256(payload.nonce) },
          include: {
            student: {
              include: {
                user: { select: { name: true } },
                section: { include: { course: { include: { department: { select: { name: true } } } } } },
              },
            },
          },
        });
      }
    } catch {
      // ignore JSON parse error
    }
  }

  if (!pass) throw new GatePassError(404, 'INVALID_TOKEN', 'Invalid QR code');
  if (pass.qrConsumedAt) throw new GatePassError(410, 'QR_CONSUMED', 'This QR code has already been used');
  if (pass.qrExpiresAt && new Date() > pass.qrExpiresAt) throw new GatePassError(410, 'QR_EXPIRED', 'QR code has expired');
  if (pass.hodStatus !== 'APPROVED') throw new GatePassError(403, 'NOT_APPROVED', 'Gate pass is not approved');

  await prisma.gatePass.update({
    where: { id: pass.id },
    data: {
      qrConsumedAt: new Date(),
      actualOutTime: new Date(),
    },
  });

  const student = pass.student;
  return {
    passId: pass.id,
    studentName: student.user.name,
    rollNo: student.rollNo,
    section: student.section.name,
    department: student.section.course.department.name,
    destination: pass.destination,
    outTime: pass.outTime,
    expectedInTime: pass.expectedInTime,
    reason: pass.reason,
  };
}

// ─── GUARD: Batch Sync Offline Scans ────────────────────────────────
export async function guardBatchSync(scans: Array<{ passId: string; actualOutTime?: string }>) {
  const results = [];
  for (const scan of scans) {
    try {
      const outDate = scan.actualOutTime ? new Date(scan.actualOutTime) : new Date();
      const updated = await prisma.gatePass.updateMany({
        where: {
          id: scan.passId,
          actualOutTime: null,
        },
        data: {
          qrConsumedAt: outDate,
          actualOutTime: outDate,
        },
      });
      results.push({ passId: scan.passId, success: true, count: updated.count });
    } catch (err: any) {
      results.push({ passId: scan.passId, success: false, error: err.message });
    }
  }
  return results;
}

// ─── GUARD: Mark Entry (Return) ─────────────────────────────────────
export async function guardMarkEntry(passId: string) {
  const pass = await prisma.gatePass.findFirst({
    where: { id: passId, actualOutTime: { not: null }, actualInTime: null },
  });
  if (!pass) throw new GatePassError(404, 'PASS_NOT_FOUND', 'Pass not found or entry already marked');

  return prisma.gatePass.update({
    where: { id: passId },
    data: { actualInTime: new Date() },
  });
}

// ─── GUARD: Get Today's Logs ─────────────────────────────────────────
export async function getGuardLogs() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  return prisma.gatePass.findMany({
    where: {
      actualOutTime: { gte: today, lte: todayEnd },
    },
    orderBy: { actualOutTime: 'desc' },
    include: {
      student: {
        include: {
          user: { select: { name: true } },
          section: true,
        },
      },
    },
  });
}
