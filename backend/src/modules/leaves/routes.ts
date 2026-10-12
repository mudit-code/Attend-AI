import { Router, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { authenticate, AuthRequest } from '../../middlewares/auth';
import { logger } from '../../lib/logger';

const router = Router();

// POST /leaves/teacher/apply - Faculty submits leave request
router.post('/teacher/apply', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fromDate, toDate, type, reason, documentUrl } = req.body;
    const userId = req.user!.id;

    const teacher = await prisma.teacher.findUnique({
      where: { userId },
    });

    if (!teacher) {
      res.status(403).json({ error: { message: 'Only faculty members can apply for teacher leave' } });
      return;
    }

    const leave = await prisma.teacherLeaveRequest.create({
      data: {
        teacherId: teacher.id,
        fromDate: new Date(fromDate),
        toDate: new Date(toDate),
        type: type || 'CASUAL',
        reason,
        documentUrl,
        status: 'PENDING',
      },
    });

    logger.info('Teacher leave applied', { teacherId: teacher.id, leaveId: leave.id });
    res.status(201).json({ message: 'Leave application submitted successfully', leave });
  } catch (err) {
    logger.error('Failed to submit teacher leave', { error: err });
    res.status(500).json({ error: { message: 'Failed to submit leave application' } });
  }
});

// GET /leaves/teacher/my - View faculty member's own leave history
router.get('/teacher/my', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const teacher = await prisma.teacher.findUnique({ where: { userId } });

    if (!teacher) {
      res.json({ leaves: [] });
      return;
    }

    const leaves = await prisma.teacherLeaveRequest.findMany({
      where: { teacherId: teacher.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ leaves });
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch leaves' } });
  }
});

// GET /leaves/admin/all - Admin views all teacher and student leaves
router.get('/admin/all', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const teacherLeaves = await prisma.teacherLeaveRequest.findMany({
      include: {
        teacher: {
          include: {
            user: { select: { name: true, email: true } },
            department: { select: { name: true, code: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const studentLeaves = await prisma.leaveRequest.findMany({
      include: {
        student: {
          include: {
            user: { select: { name: true, email: true } },
            section: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ teacherLeaves, studentLeaves });
  } catch (err) {
    logger.error('Failed to fetch admin leaves', { error: err });
    res.status(500).json({ error: { message: 'Failed to fetch leave applications' } });
  }
});

// PATCH /leaves/admin/teacher/:id/decision - Approve/Reject teacher leave
router.patch('/admin/teacher/:id/decision', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { status, decisionNote } = req.body;
    const adminUserId = req.user!.id;

    const updated = await prisma.teacherLeaveRequest.update({
      where: { id },
      data: {
        status,
        decisionNote,
        decidedBy: adminUserId,
        decidedAt: new Date(),
      },
    });

    logger.info('Teacher leave decision updated', { id, status });
    res.json({ message: `Leave ${status.toLowerCase()} successfully`, leave: updated });
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to update leave status' } });
  }
});

// PATCH /leaves/admin/student/:id/decision - Approve/Reject student leave
router.patch('/admin/student/:id/decision', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { status, decisionNote } = req.body;
    const adminUserId = req.user!.id;

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status,
        decisionNote,
        decidedBy: adminUserId,
        decidedAt: new Date(),
      },
    });

    logger.info('Student leave decision updated', { id, status });
    res.json({ message: `Student leave ${status.toLowerCase()} successfully`, leave: updated });
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to update student leave status' } });
  }
});

export default router;
