import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../../middlewares/auth';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';

const router = Router();

// GET /api/v1/dispensary/consultations
router.get(
  '/consultations',
  authenticate,
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
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { studentRollNo, studentName, doctorName, diagnosis, medicinesPrescribed } = req.body;

      if (!studentRollNo || !diagnosis) {
        res.status(400).json({ success: false, error: { message: 'Student roll number and diagnosis are required' } });
        return;
      }

      const visit = await prisma.dispensaryVisit.create({
        data: {
          studentRollNo: String(studentRollNo),
          studentName: studentName || 'Student',
          doctorName: doctorName || 'Dr. K. P. Singh (Campus CMO)',
          diagnosis,
          medicinesPrescribed: medicinesPrescribed || 'Paracetamol 650mg, ORS Sachet',
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
    const directory = [
      { name: 'Campus 24x7 Ambulance', type: 'AMBULANCE', phone: '+91 94150 00108', available: '24/7' },
      { name: 'Campus Dispensary Emergency Cell', type: 'CLINIC', phone: '0512-2580100', available: '08:00 AM - 10:00 PM' },
      { name: 'Regency Hospital Kanpur', type: 'HOSPITAL', phone: '0512-3081111', distance: '4.2 km', empanelled: true },
      { name: 'LPS Institute of Cardiology', type: 'HOSPITAL', phone: '0512-2534505', distance: '6.8 km', empanelled: true },
      { name: 'Hallet Hospital (GSVM Medical College)', type: 'TRAUMA', phone: '0512-2535483', distance: '5.5 km', empanelled: true },
    ];
    res.json({ success: true, data: directory });
  }
);

export default router;
