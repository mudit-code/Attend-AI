import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { pushBatchSchema, pullQuerySchema } from './schema';
import * as syncService from './service';

const router = Router();

router.use(authenticate);

// ─── Bootstrap (Initial Data Download) ────────────────────────────
router.get('/bootstrap', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const data = await syncService.bootstrap(user.id, user.role);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// ─── Push Outbox Batch ────────────────────────────────────────────
router.post(
  '/push',
  validate(pushBatchSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const clientIp = req.ip;
      const data = await syncService.pushBatch(user.id, req.body, clientIp);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Pull Incremental Changes ─────────────────────────────────────
router.get('/pull', validate(pullQuerySchema, 'query'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cursorStr = (req.query.cursor as string) || '0';
    const cursor = BigInt(cursorStr);
    const sectionId = req.query.sectionId ? Number(req.query.sectionId) : undefined;
    const data = await syncService.pullChanges(cursor, sectionId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

export default router;
