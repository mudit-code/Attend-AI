import { Router, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { authenticate, AuthRequest } from '../../middlewares/auth';
import { logger } from '../../lib/logger';

const router = Router();

// POST /feedback/submit - Submit institutional feedback (Teacher or Student)
router.post('/submit', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { category, subject, message } = req.body;
    const userId = req.user!.id;
    const role = req.user!.role as any;

    const feedback = await prisma.institutionalFeedback.create({
      data: {
        userId,
        role,
        category: category || 'GENERAL',
        subject,
        message,
        status: 'OPEN',
      },
    });

    logger.info('Institutional feedback submitted', { userId, feedbackId: feedback.id });
    res.status(201).json({ message: 'Feedback submitted successfully', feedback });
  } catch (err) {
    logger.error('Failed to submit feedback', { error: err });
    res.status(500).json({ error: { message: 'Failed to submit feedback' } });
  }
});

// GET /feedback/my - View current user's feedback history & replies
router.get('/my', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const feedbacks = await prisma.institutionalFeedback.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ feedbacks });
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to fetch personal feedback' } });
  }
});

// GET /feedback/admin/inbox - Admin views all feedback tickets
router.get('/admin/inbox', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const feedbacks = await prisma.institutionalFeedback.findMany({
      include: {
        user: { select: { name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ feedbacks });
  } catch (err) {
    logger.error('Failed to fetch admin feedback inbox', { error: err });
    res.status(500).json({ error: { message: 'Failed to fetch feedback tickets' } });
  }
});

// POST /feedback/admin/:id/reply - Admin replies and marks resolved
router.post('/admin/:id/reply', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { reply } = req.body;

    const updated = await prisma.institutionalFeedback.update({
      where: { id },
      data: {
        reply,
        replyDate: new Date(),
        status: 'RESOLVED',
      },
    });

    logger.info('Admin replied to feedback', { feedbackId: id });
    res.json({ message: 'Reply submitted successfully', feedback: updated });
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to submit reply' } });
  }
});

export default router;
