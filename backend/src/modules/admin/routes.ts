import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/role';
import { validate } from '../../middlewares/validate';
import { updateRulesSchema } from './schema';
import * as adminService from './service';

const router = Router();

router.use(authenticate);

// ─── Rules ────────────────────────────────────────────────────────
router.get('/rules', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await adminService.getRules();
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.put(
  '/rules',
  requireRole('ADMIN'),
  validate(updateRulesSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await adminService.updateRules(req.user!.id, req.body, req.ip);
      res.json({ data, message: 'Attendance rules updated successfully' });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Audit Logs ───────────────────────────────────────────────────
router.get(
  '/audit-logs',
  requireRole('ADMIN', 'HOD'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const entity = req.query.entity as string | undefined;
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const data = await adminService.getAuditLogs(entity, limit);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);

// ─── System Stats ─────────────────────────────────────────────────
router.get(
  '/stats',
  requireRole('ADMIN', 'HOD'),
  async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await adminService.getSystemStats();
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Device Management (Device Reset Tool) ───────────────────────
router.get(
  '/devices',
  requireRole('ADMIN', 'HOD'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const rollNo = req.query.rollNo as string;
      if (!rollNo) {
        res.status(400).json({ error: { code: 'MISSING_PARAM', message: 'rollNo query param required' } });
        return;
      }
      const data = await adminService.getDeviceByRollNo(rollNo.trim().toUpperCase());
      res.json({ data });
    } catch (err: any) {
      if (err.status) {
        res.status(err.status).json({ error: { code: err.code, message: err.message } });
        return;
      }
      next(err);
    }
  }
);

router.delete(
  '/devices/unbind/:rollNo',
  requireRole('ADMIN', 'HOD'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const rollNo = String(req.params.rollNo).trim().toUpperCase();
      const data = await adminService.unbindStudentDevice(rollNo, req.user!.id, req.ip);
      res.json({ data, message: `Device binding for Roll No ${rollNo} has been reset successfully.` });
    } catch (err: any) {
      if (err.status) {
        res.status(err.status).json({ error: { code: err.code, message: err.message } });
        return;
      }
      next(err);
    }
  }
);

// ─── Locked Session Unlock Desk ───────────────────────────────────
router.get(
  '/sessions/locked',
  requireRole('ADMIN', 'HOD'),
  async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await adminService.getLockedSessions();
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/sessions/:id/admin-unlock',
  requireRole('ADMIN', 'HOD'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { reason } = req.body;
      if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
        res.status(400).json({ error: { code: 'REASON_REQUIRED', message: 'A reason of at least 5 characters is required to unlock a session' } });
        return;
      }
      const data = await adminService.adminUnlockSession(
        req.params.id as string,
        req.user!.id,
        reason.trim(),
        req.ip
      );
      res.json({ data, message: 'Attendance session unlocked successfully. Teacher may now edit attendance.' });
    } catch (err: any) {
      if (err.status) {
        res.status(err.status).json({ error: { code: err.code, message: err.message } });
        return;
      }
      next(err);
    }
  }
);

export default router;

