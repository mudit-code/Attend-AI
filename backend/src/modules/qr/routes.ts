import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/role';
import { validate } from '../../middlewares/validate';
import { startQrSchema, markQrSchema } from './schema';
import * as qrService from './service';

const router = Router();

router.use(authenticate);

// ─── Start / Get Live QR Token (Teacher) ──────────────────────────
router.get(
  '/token/:sessionId',
  requireRole('TEACHER', 'ADMIN', 'HOD'),
  (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.params.sessionId as string;
      const data = qrService.getCurrentToken(sessionId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Mark Attendance via QR (Student) ─────────────────────────────
router.post(
  '/mark',
  requireRole('STUDENT'),
  validate(markQrSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await qrService.markQrAttendance(req.user!.id, req.body);
      res.json({ data, message: 'Attendance marked successfully via QR' });
    } catch (err: unknown) {
      const customErr = err as { code?: string; status?: number; message?: string };
      if (customErr.status) {
        res.status(customErr.status).json({
          error: { code: customErr.code || 'QR_ERROR', message: customErr.message },
        });
        return;
      }
      next(err);
    }
  }
);

export default router;
