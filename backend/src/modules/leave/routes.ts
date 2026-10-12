import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/role';
import { validate } from '../../middlewares/validate';
import { createLeaveSchema, decideLeaveSchema } from './schema';
import * as leaveService from './service';

const router = Router();

router.use(authenticate);

// ─── List Leave Requests ──────────────────────────────────────────
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const status = req.query.status as string | undefined;
    const data = await leaveService.getLeaveRequests(user.id, user.role, status);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// ─── Create Leave Request (Student) ───────────────────────────────
router.post(
  '/',
  requireRole('STUDENT'),
  validate(createLeaveSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await leaveService.createLeaveRequest(req.user!.id, req.body);
      res.status(201).json({ data, message: 'Leave request submitted successfully' });
    } catch (err: unknown) {
      const customErr = err as { code?: string; status?: number; message?: string };
      if (customErr.status) {
        res.status(customErr.status).json({
          error: { code: customErr.code || 'LEAVE_ERROR', message: customErr.message },
        });
        return;
      }
      next(err);
    }
  }
);

// ─── Decide Leave Request (Teacher / HOD / Admin) ─────────────────
router.patch(
  '/:id/decision',
  requireRole('TEACHER', 'HOD', 'ADMIN'),
  validate(decideLeaveSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const leaveId = req.params.id as string;
      const data = await leaveService.decideLeaveRequest(leaveId, req.user!.id, req.body);
      res.json({ data, message: `Leave ${req.body.decision.toLowerCase()} successfully` });
    } catch (err: unknown) {
      const customErr = err as { code?: string; status?: number; message?: string };
      if (customErr.status) {
        res.status(customErr.status).json({
          error: { code: customErr.code || 'LEAVE_ERROR', message: customErr.message },
        });
        return;
      }
      next(err);
    }
  }
);

export default router;
