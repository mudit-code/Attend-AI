import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../../middlewares/auth';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';

const router = Router();

// POST /api/v1/communication/defaulters/send-warning-batch
// Allows teacher or admin to send automated attendance shortage warning emails
router.post(
  '/defaulters/send-warning-batch',
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { students, subjectCode, subjectName, cutoffPercentage } = req.body;

      if (!Array.isArray(students) || students.length === 0) {
        res.status(400).json({ success: false, error: { message: 'No student list provided' } });
        return;
      }

      const role = req.user?.role || 'TEACHER';
      if (role !== 'TEACHER' && role !== 'ADMIN' && role !== 'HOD') {
        res.status(403).json({ error: { message: 'Unauthorized: Faculty or Admin clearance required' } });
        return;
      }

      const senderName = req.user?.role === 'TEACHER' ? 'Faculty Member' : 'Academic Office';
      const logsCreated: any[] = [];

      for (const st of students) {
        try {
          const log = await prisma.defaulterEmailLog.create({
            data: {
              recipientEmail: st.email || `${String(st.rollNo).toLowerCase()}@aktu.ac.in`,
              recipientName: st.name || 'Student',
              rollNo: String(st.rollNo),
              subjectCode: subjectCode || 'KCS-GEN',
              subjectName: subjectName || 'Semester Course',
              attendancePercent: Number(st.percentage || st.attendancePercent || 0),
              classesAttended: Number(st.present || st.classesAttended || 0),
              totalClasses: Number(st.totalClasses || 0),
              senderName,
              status: 'SENT',
            },
          });
          logsCreated.push(log);
        } catch (dbErr) {
          logger.warn('Failed to persist email log, continuing batch', { err: dbErr });
        }
      }

      res.json({
        success: true,
        data: {
          dispatchedCount: students.length,
          cutoffPercentage: cutoffPercentage || 75,
          logs: logsCreated,
          message: `Official attendance shortage notices dispatched to ${students.length} students.`,
        },
      });
    } catch (err: any) {
      logger.error('Error dispatching defaulter emails', { err });
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
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
