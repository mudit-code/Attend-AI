import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import type { LoginInput, OtpSendInput, OtpVerifyInput, RegisterInput } from './schema';

// ─── Token helpers ───────────────────────────────────────────────
function generateAccessToken(userId: number, role: string, departmentId?: number): string {
  return jwt.sign(
    { sub: userId, role, departmentId },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as any }
  );
}

async function createRefreshToken(userId: number): Promise<string> {
  const rawToken = crypto.randomBytes(64).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt },
  });

  return rawToken;
}

// ─── Login ───────────────────────────────────────────────────────
export async function listRegistrationSections() {
  return prisma.section.findMany({
    select: {
      id: true,
      name: true,
      year: true,
      course: {
        select: {
          name: true,
          department: { select: { name: true } },
        },
      },
    },
    orderBy: [{ year: 'asc' }, { name: 'asc' }],
  });
}

export async function loginService(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: {
      teacher: { select: { id: true, departmentId: true } },
      student: { select: { id: true, sectionId: true, rollNo: true } },
    },
  });

  if (!user || user.status !== 'ACTIVE') {
    throw { code: 'INVALID_CREDENTIALS', status: 401 };
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw { code: 'INVALID_CREDENTIALS', status: 401 };
  }

  const departmentId = user.teacher?.departmentId;
  const accessToken = generateAccessToken(user.id, user.role, departmentId);
  const refreshToken = await createRefreshToken(user.id);

  logger.info('User logged in', { userId: user.id, role: user.role });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      teacher: user.teacher,
      student: user.student,
    },
  };
}

// ─── Refresh ─────────────────────────────────────────────────────
export async function refreshService(rawToken: string) {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw { code: 'INVALID_REFRESH_TOKEN', status: 401 };
  }

  if (stored.user.status !== 'ACTIVE') {
    throw { code: 'USER_INACTIVE', status: 401 };
  }

  // Rotate: revoke old, create new
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const newRawToken = await createRefreshToken(stored.userId);
  const teacher = await prisma.teacher.findUnique({ where: { userId: stored.userId } });
  const accessToken = generateAccessToken(
    stored.userId,
    stored.user.role,
    teacher?.departmentId
  );

  return { accessToken, refreshToken: newRawToken };
}

// ─── Logout ──────────────────────────────────────────────────────
export async function logoutService(rawToken: string) {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  await prisma.refreshToken.updateMany({
    where: { tokenHash },
    data: { revokedAt: new Date() },
  });
}

// ─── Parent OTP ──────────────────────────────────────────────────
const OTP_TTL = 10 * 60; // 10 minutes
const OTP_MAX_ATTEMPTS = 3;

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendParentOTPService(input: OtpSendInput, parentId: number) {
  // Rate limit: 5 OTPs per day
  const dailyKey = `otp:daily:${parentId}`;
  const daily = await redis.incr(dailyKey);
  if (daily === 1) await redis.expire(dailyKey, 86400);
  if (daily > 5) throw { code: 'OTP_RATE_LIMIT', status: 429 };

  // Cooldown: 60s between sends
  const cooldownKey = `otp:cooldown:${parentId}`;
  if (await redis.exists(cooldownKey)) throw { code: 'OTP_COOLDOWN', status: 429 };

  const otp = generateOTP();
  const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

  await redis.setex(`otp:${parentId}`, OTP_TTL, JSON.stringify({ hash: otpHash, attempts: 0 }));
  await redis.setex(cooldownKey, 60, '1');

  // SMS → Email fallback
  let channel = 'none';
  if (env.SMS_ENABLED && input.phone) {
    // TODO: integrate SMS provider
    logger.info('SMS OTP would be sent', { phone: input.phone });
    channel = 'sms';
  } else if (input.email) {
    // TODO: integrate email provider
    logger.info('Email OTP would be sent', { email: input.email, otp });
    channel = 'email';
  }

  return { channel, expiresInSeconds: OTP_TTL };
}

export async function verifyParentOTPService(input: OtpVerifyInput) {
  const key = `otp:${input.parentId}`;
  const stored = await redis.get(key);

  if (!stored) throw { code: 'OTP_EXPIRED', status: 400 };

  const data = JSON.parse(stored) as { hash: string; attempts: number };

  if (data.attempts >= OTP_MAX_ATTEMPTS) {
    await redis.del(key);
    throw { code: 'OTP_MAX_ATTEMPTS', status: 400 };
  }

  const inputHash = crypto.createHash('sha256').update(input.otp).digest('hex');
  if (inputHash !== data.hash) {
    data.attempts++;
    await redis.setex(key, OTP_TTL, JSON.stringify(data));
    throw { code: 'OTP_INVALID', status: 400 };
  }

  await redis.del(key);

  // Get parent user
  const parent = await prisma.parent.findUnique({
    where: { id: input.parentId },
    include: { user: true },
  });

  if (!parent) throw { code: 'PARENT_NOT_FOUND', status: 404 };

  const accessToken = generateAccessToken(parent.userId, 'PARENT');
  const refreshToken = await createRefreshToken(parent.userId);

  return { accessToken, refreshToken, user: { id: parent.userId, role: 'PARENT', name: parent.user.name } };
}

// ─── Register Service ──────────────────────────────────────────
export async function registerService(input: RegisterInput) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existing) {
    throw { code: 'EMAIL_ALREADY_EXISTS', status: 409, message: 'An account with this email already exists' };
  }

  if (input.phone) {
    const existingPhone = await prisma.user.findUnique({
      where: { phone: input.phone },
      select: { id: true },
    });
    if (existingPhone) {
      throw { code: 'PHONE_ALREADY_EXISTS', status: 409, message: 'An account with this phone number already exists' };
    }
  }

  const existingRoll = await prisma.student.findUnique({
    where: { rollNo: input.rollNo },
    select: { id: true },
  });
  if (existingRoll) {
    throw { code: 'ROLL_EXISTS', status: 409, message: 'An account with this roll number already exists' };
  }

  const section = await prisma.section.findUnique({
    where: { id: input.sectionId },
    select: { id: true },
  });
  if (!section) {
    throw { code: 'SECTION_NOT_FOUND', status: 400, message: 'The selected class no longer exists. Refresh and choose a valid class.' };
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash,
      role: input.role,
      status: 'ACTIVE',
      phone: input.phone || undefined,
      student: {
        create: {
          rollNo: input.rollNo,
          sectionId: input.sectionId,
        },
      },
    },
    include: {
      student: { select: { id: true, sectionId: true, rollNo: true } },
    },
  });

  const accessToken = generateAccessToken(user.id, user.role);
  const refreshToken = await createRefreshToken(user.id);

  logger.info('New user registered', { userId: user.id, role: user.role });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      student: user.student,
    },
  };
}
