import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import {
  applyGatePassSchema,
  mentorDecisionSchema,
  hodDecisionSchema,
  guardScanSchema,
} from './schema';
import * as service from './service';
import { GatePassError } from './errors';

const router = Router();

// ─── Guard Token Middleware ────────────────────────────────────────
// Guard desk accesses via ?token=GUARD_TOKEN (simpler than JWT for a kiosk)
function guardAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.query.token as string | undefined;
  const guardToken = process.env.GUARD_TOKEN;
  if (!guardToken || token !== guardToken) {
    res.status(401).json({ error: { code: 'GUARD_UNAUTHORIZED', message: 'Invalid guard token' } });
    return;
  }
  next();
}

// ─── Role check helpers ────────────────────────────────────────────
function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
      return;
    }
    next();
  };
}

// ─── Error wrapper ─────────────────────────────────────────────────
function wrap(fn: (req: AuthRequest, res: Response) => Promise<unknown>) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await fn(req, res);
    } catch (err) {
      if (err instanceof GatePassError) {
        res.status(err.status).json({ error: { code: err.code, message: err.message } });
      } else {
        next(err);
      }
    }
  };
}

// ─── STUDENT routes ────────────────────────────────────────────────

// POST /api/v1/gatepass — Apply for gate pass
router.post(
  '/',
  authenticate,
  requireRole('STUDENT'),
  validate(applyGatePassSchema),
  wrap(async (req, res) => {
    const pass = await service.applyGatePass(req.user!.id, req.body);
    res.status(201).json({ success: true, data: pass });
  })
);

// GET /api/v1/gatepass/my — Get my passes
router.get(
  '/my',
  authenticate,
  requireRole('STUDENT'),
  wrap(async (req, res) => {
    const passes = await service.getMyPasses(req.user!.id);
    res.json({ success: true, data: passes });
  })
);

// GET /api/v1/gatepass/my/qr/:id — Get QR pass info
router.get(
  '/my/qr/:id',
  authenticate,
  requireRole('STUDENT'),
  wrap(async (req, res) => {
    const data = await service.getMyQr(req.user!.id, req.params['id'] as string);
    res.json({ success: true, data });
  })
);

// ─── TEACHER routes ────────────────────────────────────────────────

// GET /api/v1/gatepass/mentor-queue
router.get(
  '/mentor-queue',
  authenticate,
  requireRole('TEACHER'),
  wrap(async (req, res) => {
    const queue = await service.getMentorQueue(req.user!.id);
    res.json({ success: true, data: queue });
  })
);

// PATCH /api/v1/gatepass/:id/mentor-decision
router.patch(
  '/:id/mentor-decision',
  authenticate,
  requireRole('TEACHER'),
  validate(mentorDecisionSchema),
  wrap(async (req, res) => {
    const pass = await service.mentorDecide(req.user!.id, req.params['id'] as string, req.body);
    res.json({ success: true, data: pass });
  })
);

// ─── HOD/ADMIN routes ──────────────────────────────────────────────

// GET /api/v1/gatepass/hod-queue
router.get(
  '/hod-queue',
  authenticate,
  requireRole('ADMIN', 'HOD'),
  wrap(async (req, res) => {
    const queue = await service.getHodQueue();
    res.json({ success: true, data: queue });
  })
);

// PATCH /api/v1/gatepass/:id/hod-decision
router.patch(
  '/:id/hod-decision',
  authenticate,
  requireRole('ADMIN', 'HOD'),
  validate(hodDecisionSchema),
  wrap(async (req, res) => {
    const result = await service.hodDecide(req.params['id'] as string, req.body);
    res.json({ success: true, data: result });
  })
);

// ─── GUARD routes (token-based, no JWT) ───────────────────────────

// POST /api/v1/gatepass/guard/scan?token=GUARD_TOKEN
router.post(
  '/guard/scan',
  guardAuth,
  validate(guardScanSchema),
  wrap(async (req, res) => {
    const result = await service.guardScan(req.body.rawToken);
    res.json({ success: true, data: result });
  })
);

// POST /api/v1/gatepass/guard/batch-sync?token=GUARD_TOKEN
router.post(
  '/guard/batch-sync',
  guardAuth,
  wrap(async (req, res) => {
    const results = await service.guardBatchSync(req.body.scans || []);
    res.json({ success: true, data: results });
  })
);

// POST /api/v1/gatepass/guard/entry/:id?token=GUARD_TOKEN
router.post(
  '/guard/entry/:id',
  guardAuth,
  wrap(async (req, res) => {
    const result = await service.guardMarkEntry(req.params['id'] as string);
    res.json({ success: true, data: result });
  })
);

// GET /api/v1/gatepass/guard/logs?token=GUARD_TOKEN
router.get(
  '/guard/logs',
  guardAuth,
  wrap(async (req, res) => {
    const logs = await service.getGuardLogs();
    res.json({ success: true, data: logs });
  })
);

export default router;
