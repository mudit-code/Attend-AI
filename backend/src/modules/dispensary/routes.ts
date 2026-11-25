import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/role';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';

const router = Router();

// GET /api/v1/dispensary/consultations
router.get(
  '/consultations',
  authenticate,
  requireRole('ADMIN', 'HOD', 'TEACHER'),
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const visits = await prisma.dispensaryVisit.findMany({
        orderBy: { visitDate: 'desc' },
        take: 50,
      });

      res.json({ success: true, data: visits });
    } catch (err: any) {
      logger.error('Error fetching dispensary visits', { err });
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }
);

// POST /api/v1/dispensary/consultation/log
router.post(
  '/consultation/log',
  authenticate,
  requireRole('ADMIN', 'HOD', 'TEACHER'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { studentRollNo, doctorName, diagnosis, medicinesPrescribed } = req.body;

      if (!studentRollNo || !String(doctorName || '').trim() || !String(diagnosis || '').trim()) {
        res.status(400).json({ success: false, error: { message: 'Student roll number, clinician name, and diagnosis are required' } });
        return;
      }

      const student = await prisma.student.findUnique({
        where: { rollNo: String(studentRollNo).trim() },
        include: { user: { select: { name: true } } },
      });
      if (!student) {
        res.status(404).json({ success: false, error: { message: 'Student roll number was not found' } });
        return;
      }

      const visit = await prisma.dispensaryVisit.create({
        data: {
          studentRollNo: student.rollNo,
          studentName: student.user.name,
          doctorName: String(doctorName).trim(),
          diagnosis: String(diagnosis).trim(),
          medicinesPrescribed: String(medicinesPrescribed || '').trim(),
        },
      });

      res.json({ success: true, data: visit });
    } catch (err: any) {
      logger.error('Error logging dispensary consultation', { err });
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }
);

// GET /api/v1/dispensary/verify-visit/:rollNo
// Allows admin or faculty to verify if student visited campus dispensary on dates of medical leave
router.get(
  '/verify-visit/:rollNo',
  authenticate,
  requireRole('ADMIN', 'HOD', 'TEACHER'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const rollNo = String(req.params.rollNo);
      const visits = await prisma.dispensaryVisit.findMany({
        where: { studentRollNo: rollNo },
        orderBy: { visitDate: 'desc' },
      });

      res.json({
        success: true,
        data: {
          verified: visits.length > 0,
          totalVisits: visits.length,
          recentVisits: visits,
        },
      });
    } catch (err: any) {
      logger.error('Error verifying dispensary visit', { err });
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }
);

// GET /api/v1/dispensary/stock
router.get(
  '/stock',
  authenticate,
  requireRole('ADMIN', 'HOD', 'TEACHER'),
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const stock = await prisma.medicineInventory.findMany({
        orderBy: { name: 'asc' },
      });

      res.json({ success: true, data: stock });
    } catch (err: any) {
      logger.error('Error fetching medicine stock', { err });
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }
);

// GET /api/v1/dispensary/emergency-directory
router.get(
  '/emergency-directory',
  async (_req: AuthRequest, res: Response): Promise<void> => {
    res.json({ success: true, data: [] });
  }
);

export default router;
