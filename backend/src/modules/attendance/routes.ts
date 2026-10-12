import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/role';
import { validate } from '../../middlewares/validate';
import {
  createSessionSchema,
  markRecordsSchema,
  updateRecordSchema,
  unlockSessionSchema,
} from './schema';
import * as attendanceService from './service';
import { prisma } from '../../lib/prisma';

const router = Router();

router.use(authenticate);

// ─── Create or Find Session ───────────────────────────────────────
router.post(
  '/sessions',
  requireRole('TEACHER', 'ADMIN', 'HOD'),
  validate(createSessionSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      let teacherId: number | undefined;

      if (user.role === 'TEACHER') {
        const teacher = await prisma.teacher.findUnique({ where: { userId: user.id } });
        if (!teacher) {
          res.status(403).json({ error: { code: 'NOT_TEACHER', message: 'Teacher profile not found' } });
          return;
        }
        teacherId = teacher.id;
      } else {
        // Admin or HOD can create on behalf of teacher, default to first teacher
        const firstTeacher = await prisma.teacher.findFirst();
        teacherId = firstTeacher?.id || 1;
      }

      const session = await attendanceService.createSession(teacherId, req.body);
      res.status(201).json({ data: session });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Get Session Details ──────────────────────────────────────────
router.get('/sessions/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const session = await attendanceService.getSession(req.params.id as string);
    res.json({ data: session });
  } catch (err: unknown) {
    const customErr = err as { code?: string; status?: number; message?: string };
    if (customErr.status) {
      res.status(customErr.status).json({
        error: { code: customErr.code || 'ERROR', message: customErr.message },
      });
      return;
    }
    next(err);
  }
});

// ─── Mark Attendance Records in Session ───────────────────────────
router.post(
  '/sessions/:id/records',
  requireRole('TEACHER', 'ADMIN', 'HOD'),
  validate(markRecordsSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.params.id as string;
      const clientIp = req.ip;
      const records = await attendanceService.markRecords(
        sessionId,
        req.user!.id,
        req.body,
        clientIp
      );
      res.json({ data: records, count: records.length });
    } catch (err: unknown) {
      const customErr = err as { code?: string; status?: number; message?: string };
      if (customErr.status) {
        res.status(customErr.status).json({
          error: { code: customErr.code || 'ERROR', message: customErr.message },
        });
        return;
      }
      next(err);
    }
  }
);

// ─── Update Single Record ─────────────────────────────────────────
router.patch(
  '/records/:id',
  requireRole('TEACHER', 'ADMIN', 'HOD'),
  validate(updateRecordSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const recordId = req.params.id as string;
      const clientIp = req.ip;
      const updated = await attendanceService.updateRecord(
        recordId,
        req.user!.id,
        req.body,
        clientIp
      );
      res.json({ data: updated });
    } catch (err: unknown) {
      const customErr = err as { code?: string; status?: number; message?: string };
      if (customErr.status) {
        res.status(customErr.status).json({
          error: { code: customErr.code || 'ERROR', message: customErr.message },
        });
        return;
      }
      next(err);
    }
  }
);

// ─── Unlock Session (HOD or Admin only) ───────────────────────────
router.post(
  '/sessions/:id/unlock',
  requireRole('ADMIN', 'HOD'),
  validate(unlockSessionSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.params.id as string;
      const clientIp = req.ip;
      const session = await attendanceService.unlockSession(
        sessionId,
        req.user!.id,
        req.body,
        clientIp
      );
      res.json({ data: session, message: 'Session unlocked successfully' });
    } catch (err: unknown) {
      const customErr = err as { code?: string; status?: number; message?: string };
      if (customErr.status) {
        res.status(customErr.status).json({
          error: { code: customErr.code || 'ERROR', message: customErr.message },
        });
        return;
      }
      next(err);
    }
  }
);

// ─── Teacher's Recent Sessions ────────────────────────────────────
router.get('/my-sessions', requireRole('TEACHER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const teacher = await prisma.teacher.findUnique({ where: { userId: req.user!.id } });
    if (!teacher) {
      res.status(403).json({ error: { code: 'NOT_TEACHER', message: 'Teacher profile not found' } });
      return;
    }
    const data = await attendanceService.getTeacherSessions(teacher.id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

export default router;
