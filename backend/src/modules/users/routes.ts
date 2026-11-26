import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/role';
import { validate } from '../../middlewares/validate';
import { createStudentSchema, createTeacherSchema, bulkStudentSchema } from './schema';
import * as usersService from './service';
import { prisma } from '../../lib/prisma';

const router = Router();

router.use(authenticate);

// ─── Students ─────────────────────────────────────────────────────
router.get('/students', requireRole('ADMIN', 'HOD', 'TEACHER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const sectionId = req.query.sectionId ? Number(req.query.sectionId) : undefined;
    const search = req.query.search as string | undefined;
    if (req.user!.role === 'TEACHER') {
      if (!sectionId) {
        res.status(400).json({ error: { code: 'SECTION_REQUIRED', message: 'Select an assigned class to view its students.' } });
        return;
      }
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user!.id }, select: { id: true } });
      const allocation = teacher && await prisma.teacherSubject.findFirst({
        where: { teacherId: teacher.id, sectionId },
        select: { id: true },
      });
      if (!allocation) {
        res.status(403).json({ error: { code: 'NOT_ASSIGNED', message: 'You are not assigned to this class.' } });
        return;
      }
    }
    const data = await usersService.getStudents(sectionId, search);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// ─── Student Face Registration & Status ───────────────────────────
router.post(
  '/student/register-face',
  requireRole('STUDENT'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { descriptor } = req.body;
      if (!Array.isArray(descriptor) || descriptor.length < 50) {
        res.status(400).json({ error: { code: 'INVALID_DESCRIPTOR', message: 'Valid face embedding vector required' } });
        return;
      }
      const student = await prisma.student.update({
        where: { userId: req.user!.id },
        data: {
          faceDescriptor: descriptor,
          faceRegisteredAt: new Date(),
        },
      });
      res.json({
        success: true,
        message: 'Face ID registered successfully',
        data: { studentId: student.id, registeredAt: student.faceRegisteredAt },
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/student/face-status',
  requireRole('STUDENT'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const student = await prisma.student.findUnique({
        where: { userId: req.user!.id },
        select: { id: true, faceRegisteredAt: true, faceDescriptor: true },
      });
      const isRegistered = Boolean(student?.faceDescriptor && student.faceDescriptor.length > 0);
      res.json({
        success: true,
        data: {
          isRegistered,
          registeredAt: student?.faceRegisteredAt,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/students',
  requireRole('ADMIN'),
  validate(createStudentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await usersService.createStudent(req.body);
      res.status(201).json({ data });
    } catch (err: unknown) {
      const customErr = err as { code?: string; status?: number; message?: string };
      if (customErr.status) {
        res.status(customErr.status).json({
          error: { code: customErr.code || 'USER_ERROR', message: customErr.message },
        });
        return;
      }
      next(err);
    }
  }
);

router.post(
  '/students/bulk',
  requireRole('ADMIN'),
  validate(bulkStudentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await usersService.bulkUploadStudents(req.body);
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Teachers ─────────────────────────────────────────────────────
router.get('/teachers', requireRole('ADMIN', 'HOD'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const departmentId = req.query.departmentId ? Number(req.query.departmentId) : undefined;
    const data = await usersService.getTeachers(departmentId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/teachers',
  requireRole('ADMIN'),
  validate(createTeacherSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await usersService.createTeacher(req.body);
      res.status(201).json({ data });
    } catch (err: unknown) {
      const customErr = err as { code?: string; status?: number; message?: string };
      if (customErr.status) {
        res.status(customErr.status).json({
          error: { code: customErr.code || 'USER_ERROR', message: customErr.message },
        });
        return;
      }
      next(err);
    }
  }
);

export default router;
