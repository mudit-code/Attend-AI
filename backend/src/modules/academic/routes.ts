import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/role';
import { validate } from '../../middlewares/validate';
import {
  departmentSchema,
  courseSchema,
  sectionSchema,
  subjectSchema,
  teacherSubjectSchema,
  timetableSlotSchema,
  holidaySchema,
} from './schema';
import * as academicService from './service';

const router = Router();

// All academic routes require authentication
router.use(authenticate);

router.get('/years', requireRole('ADMIN', 'HOD'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await academicService.getAcademicYears();
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// ─── Departments ──────────────────────────────────────────────────
router.get('/departments', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await academicService.getDepartments();
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/departments',
  requireRole('ADMIN'),
  validate(departmentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await academicService.createDepartment(req.body);
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Courses ──────────────────────────────────────────────────────
router.get('/courses', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deptId = req.query.departmentId ? Number(req.query.departmentId) : undefined;
    const data = await academicService.getCourses(deptId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/courses',
  requireRole('ADMIN'),
  validate(courseSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await academicService.createCourse(req.body);
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Sections ─────────────────────────────────────────────────────
router.get('/sections', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courseId = req.query.courseId ? Number(req.query.courseId) : undefined;
    const data = await academicService.getSections(courseId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/sections',
  requireRole('ADMIN'),
  validate(sectionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await academicService.createSection(req.body);
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/sections/:id/face-toggle',
  requireRole('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      const isEnabled = Boolean(req.body.isFaceAttendanceEnabled);
      const data = await academicService.toggleSectionFaceAttendance(id, isEnabled);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Subjects ─────────────────────────────────────────────────────
router.get('/subjects', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await academicService.getSubjects();
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/subjects',
  requireRole('ADMIN'),
  validate(subjectSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await academicService.createSubject(req.body);
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Teacher Subject Allocation ──────────────────────────────────
router.post(
  '/teacher-subjects',
  requireRole('ADMIN', 'HOD'),
  validate(teacherSubjectSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await academicService.assignTeacherSubject(req.body);
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Timetable Slots ─────────────────────────────────────────────
router.get('/timetable', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sectionId = req.query.sectionId ? Number(req.query.sectionId) : undefined;
    const teacherId = req.query.teacherId ? Number(req.query.teacherId) : undefined;
    const data = await academicService.getTimetableSlots(sectionId, teacherId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/timetable',
  requireRole('ADMIN', 'HOD'),
  validate(timetableSlotSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await academicService.createTimetableSlot(req.body);
      res.status(201).json({ data });
    } catch (err: unknown) {
      const customErr = err as { code?: string; status?: number; message?: string };
      if (customErr.status) {
        res.status(customErr.status).json({
          error: { code: customErr.code || 'TIMETABLE_ERROR', message: customErr.message },
        });
        return;
      }
      next(err);
    }
  }
);

router.delete(
  '/timetable/:id',
  requireRole('ADMIN', 'HOD'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await academicService.deleteTimetableSlot(Number(req.params.id));
      res.json({ message: 'Timetable slot removed successfully' });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/timetable/pre-generate-sessions',
  requireRole('ADMIN', 'HOD'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await academicService.preGenerateTodaySessions();
      res.json({ data: result, message: `Pre-scheduled sessions generated for today (${result.date})` });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Holidays ─────────────────────────────────────────────────────
router.get('/holidays', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await academicService.getHolidays();
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/holidays',
  requireRole('ADMIN'),
  validate(holidaySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await academicService.createHoliday(req.body);
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Today's Timetable (Student) ─────────────────────────────────
router.get(
  '/timetable/today',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await academicService.getTodayTimetable(req as AuthRequest);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Today's Timetable (Teacher) ─────────────────────────────────
router.get(
  '/timetable/teacher/today',
  requireRole('TEACHER', 'HOD'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await academicService.getTeacherTodayTimetable(req as AuthRequest);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Teacher Assigned Classes (Quick-Switch Chips) ───────────────
router.get(
  '/teacher/assigned-classes',
  requireRole('TEACHER', 'HOD'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const data = await academicService.getTeacherAssignedClasses(userId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Faculty Substitution / Class Adjustment ─────────────────────
router.post(
  '/adjustments',
  requireRole('ADMIN', 'HOD'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await academicService.createClassAdjustment(req.user!.id, req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/adjustments/today',
  requireRole('TEACHER', 'HOD'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await academicService.getTeacherAdjustments(req.user!.id, req.query.date as string | undefined);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/adjustments/department',
  requireRole('ADMIN', 'HOD'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const deptId = req.query.departmentId ? Number(req.query.departmentId) : undefined;
      const data = await academicService.getDepartmentAdjustments(req.query.date as string | undefined, deptId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  '/adjustments/:id',
  requireRole('ADMIN', 'HOD'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await academicService.deleteClassAdjustment(Number(req.params.id));
      res.json({ success: true, message: 'Class adjustment cancelled successfully.' });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Semester Roll-over & Batch Promotion ────────────────────────
router.post(
  '/batch-promotion',
  requireRole('ADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await academicService.promoteSectionBatch(req.user!.id, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/batch-promotion/logs',
  requireRole('ADMIN', 'HOD'),
  async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await academicService.getPromotionLogs();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/student-history',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const targetUserId = req.query.userId ? Number(req.query.userId) : req.user!.id;
      const data = await academicService.getStudentAcademicHistory(targetUserId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

