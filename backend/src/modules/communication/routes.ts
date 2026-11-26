import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/role';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { sendDefaulterWarningBatch, isSmtpConfigured } from '../../lib/email';
import { getDefaulters } from '../reports/service';
import { getNotices } from '../notices/service';

const router = Router();

// POST /api/v1/communication/defaulters/send-warning-batch
// Allows teacher or admin to send automated attendance shortage warning emails
router.post(
  '/defaulters/send-warning-batch',
  authenticate,
  requireRole('TEACHER', 'ADMIN', 'HOD'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      let senderName = 'Department Academic Coordinator';
      if (req.user?.id) {
        const u = await prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true } });
        if (u?.name) senderName = u.name;
      }
      let listToDispatch = req.body?.defaulters;

      // If no explicit list passed, fetch from reports service
      if (!listToDispatch || !Array.isArray(listToDispatch) || listToDispatch.length === 0) {
        const { defaulters } = await getDefaulters(
          req.body?.minPercent || 75,
          req.body?.sectionId ? Number(req.body.sectionId) : undefined,
          req.body?.departmentId ? Number(req.body.departmentId) : undefined
        );
        listToDispatch = defaulters.map((d: any) => ({
          email: d.email,
          name: d.name,
          rollNo: d.rollNo,
          subjectCode: req.body?.subjectCode || 'CORE',
          subjectName: req.body?.subjectName || `${d.course} Attendance`,
          attendancePercent: d.percentage,
          classesAttended: d.attended,
          totalClasses: d.totalClasses,
          senderName,
        }));
      } else {
        listToDispatch = listToDispatch.map((d: any) => ({
          email: d.email,
          name: d.name,
          rollNo: d.rollNo,
          subjectCode: d.subjectCode || 'ACADEMIC',
          subjectName: d.subjectName || 'Course Attendance',
          attendancePercent: d.attendancePercent ?? d.percentage ?? 0,
          classesAttended: d.classesAttended ?? d.attended ?? 0,
          totalClasses: d.totalClasses ?? 0,
          senderName: d.senderName || senderName,
        }));
      }

      if (listToDispatch.length === 0) {
        res.json({
          success: true,
          message: 'No defaulters found matching criteria. No emails sent.',
          data: { total: 0, sent: 0, simulated: 0, failed: 0 },
        });
        return;
      }

      const result = await sendDefaulterWarningBatch(listToDispatch);

      res.json({
        success: true,
        message: isSmtpConfigured()
          ? `Dispatched ${result.sent} real warning emails (${result.failed} failed).`
          : `Simulated ${result.simulated} warning emails (SMTP credentials not configured; audit logged).`,
        data: result,
      });
    } catch (err: any) {
      logger.error('Error in send-warning-batch', { error: err.message });
      res.status(500).json({ success: false, error: { message: err.message || 'Internal server error' } });
    }
  }
);

// GET /api/v1/communication/notices (fallback alias for GET /api/v1/notices)
router.get(
  '/notices',
  authenticate,
  async (req: AuthRequest, res: Response, next): Promise<void> => {
    try {
      const data = await getNotices(req.user?.role || 'STUDENT');
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
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
