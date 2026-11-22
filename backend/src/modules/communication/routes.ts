import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/role';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';

const router = Router();

// POST /api/v1/communication/defaulters/send-warning-batch
// Allows teacher or admin to send automated attendance shortage warning emails
router.post(
  '/defaulters/send-warning-batch',
  authenticate,
  requireRole('TEACHER', 'ADMIN', 'HOD'),
  async (_req: AuthRequest, res: Response): Promise<void> => {
    res.status(503).json({
      success: false,
      error: { code: 'EMAIL_DELIVERY_NOT_CONFIGURED', message: 'Email delivery is not configured. No messages were sent.' },
    });
  }
);

// GET /api/v1/communication/defaulters/logs
router.get(
  '/defaulters/logs',
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const role = req.user?.role || 'TEACHER';
      if (role !== 'TEACHER' && role !== 'ADMIN' && role !== 'HOD') {
        res.status(403).json({ error: { message: 'Unauthorized' } });
        return;
      }

      const logs = await prisma.defaulterEmailLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      res.json({ success: true, data: logs });
    } catch (err: any) {
      logger.error('Error fetching email audit logs', { err });
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }
);

export default router;
