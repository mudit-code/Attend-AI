import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/role';
import { validate } from '../../middlewares/validate';
import { createCorrectionSchema, decideCorrectionSchema } from './schema';
import * as correctionService from './service';

const router = Router();

router.use(authenticate);

// ─── List Correction Requests ─────────────────────────────────────
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const status = req.query.status as string | undefined;
    const data = await correctionService.getCorrectionRequests(user.id, user.role, status);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// ─── Create Correction Request (Student) ──────────────────────────
router.post(
  '/',
  requireRole('STUDENT'),
  validate(createCorrectionSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await correctionService.createCorrectionRequest(req.user!.id, req.body);
      res.status(201).json({ data, message: 'Correction request submitted successfully' });
    } catch (err: unknown) {
      const customErr = err as { code?: string; status?: number; message?: string };
      if (customErr.status) {
        res.status(customErr.status).json({
          error: { code: customErr.code || 'CORRECTION_ERROR', message: customErr.message },
        });
        return;
      }
      next(err);
    }
  }
);

// ─── Decide Correction Request (Teacher / HOD / Admin) ────────────
router.patch(
  '/:id/decision',
  requireRole('TEACHER', 'HOD', 'ADMIN'),
  validate(decideCorrectionSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const clientIp = req.ip;
      const data = await correctionService.decideCorrectionRequest(id, req.user!.id, req.body, clientIp);
      res.json({ data, message: `Correction request ${req.body.decision.toLowerCase()} successfully` });
    } catch (err: unknown) {
      const customErr = err as { code?: string; status?: number; message?: string };
      if (customErr.status) {
        res.status(customErr.status).json({
          error: { code: customErr.code || 'CORRECTION_ERROR', message: customErr.message },
        });
        return;
      }
      next(err);
    }
  }
);

export default router;
