import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/role';
import * as reportsService from './service';
import { prisma } from '../../lib/prisma';

const router = Router();

router.use(authenticate);

// ─── Student Report (Self or Authorized) ──────────────────────────
router.get('/student/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const studentId = Number(req.params.id);
    const user = req.user!;

    // If student, ensure they are requesting their own report
    if (user.role === 'STUDENT') {
      const student = await prisma.student.findUnique({ where: { userId: user.id } });
      if (!student || student.id !== studentId) {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You can only view your own report' } });
        return;
      }
    }

    const data = await reportsService.getStudentReport(studentId);
    res.json({ data });
  } catch (err: unknown) {
    const customErr = err as { code?: string; status?: number; message?: string };
    if (customErr.status) {
      res.status(customErr.status).json({
        error: { code: customErr.code || 'REPORT_ERROR', message: customErr.message },
      });
      return;
    }
    next(err);
  }
});

// ─── My Report (For logged-in Student) ─────────────────────────────
router.get('/my-report', requireRole('STUDENT'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user!.id } });
    if (!student) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Student profile not found' } });
      return;
    }
    const data = await reportsService.getStudentReport(student.id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// ─── Class Report ─────────────────────────────────────────────────
router.get(
  '/class',
  requireRole('TEACHER', 'HOD', 'ADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const sectionId = Number(req.query.sectionId);
      if (!sectionId) {
        res.status(400).json({ error: { code: 'MISSING_PARAM', message: 'sectionId query parameter required' } });
        return;
      }
      const subjectId = req.query.subjectId ? Number(req.query.subjectId) : undefined;
      const data = await reportsService.getClassReport(sectionId, subjectId);
      res.json({ data });
    } catch (err: unknown) {
      const customErr = err as { code?: string; status?: number; message?: string };
      if (customErr.status) {
        res.status(customErr.status).json({
          error: { code: customErr.code || 'REPORT_ERROR', message: customErr.message },
        });
        return;
      }
      next(err);
    }
  }
);

// ─── Defaulters List ──────────────────────────────────────────────
router.get(
  '/defaulters',
  requireRole('TEACHER', 'HOD', 'ADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const minPercent = req.query.minPercent ? Number(req.query.minPercent) : 75;
      const sectionId = req.query.sectionId ? Number(req.query.sectionId) : undefined;
      const departmentId = req.query.departmentId ? Number(req.query.departmentId) : undefined;
      const data = await reportsService.getDefaulters(minPercent, sectionId, departmentId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Export Defaulters (CSV) ──────────────────────────────────────
router.get(
  '/export',
  requireRole('TEACHER', 'HOD', 'ADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const minPercent = req.query.minPercent ? Number(req.query.minPercent) : 75;
      const sectionId = req.query.sectionId ? Number(req.query.sectionId) : undefined;
      const csv = await reportsService.exportDefaultersCSV(minPercent, sectionId);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="defaulters_report.csv"');
      res.send(csv);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
