import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/role';
import { validate } from '../../middlewares/validate';
import { createStudentSchema, createTeacherSchema, bulkStudentSchema } from './schema';
import * as usersService from './service';

const router = Router();

router.use(authenticate);

// ─── Students ─────────────────────────────────────────────────────
router.get('/students', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sectionId = req.query.sectionId ? Number(req.query.sectionId) : undefined;
    const search = req.query.search as string | undefined;
    const data = await usersService.getStudents(sectionId, search);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

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
router.get('/teachers', async (req: Request, res: Response, next: NextFunction) => {
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
