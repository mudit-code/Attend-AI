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

export default router;
