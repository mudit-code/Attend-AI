import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/role';
import { validate } from '../../middlewares/validate';
import { AssignmentWorkflowError } from './errors';
import {
  assignmentIdSchema,
  createAssignmentSchema,
  gradeSubmissionSchema,
  submissionIdSchema,
  submitAssignmentSchema,
} from './schema';
import * as assignmentService from './service';

const router = Router();
router.use(authenticate);

function handleError(error: unknown, res: Response, next: NextFunction) {
  if (error instanceof AssignmentWorkflowError) {
    res.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }
  next(error);
}

router.get(
  '/mine',
  requireRole('STUDENT'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await assignmentService.listStudentAssignments(req.user!.id);
      res.json({ success: true, data });
    } catch (error) {
      handleError(error, res, next);
    }
  }
);

// GET /api/v1/assignments/student (alias for /mine)
router.get(
  '/student',
  requireRole('STUDENT'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await assignmentService.listStudentAssignments(req.user!.id);
      res.json({ success: true, data });
    } catch (error) {
      handleError(error, res, next);
    }
  }
);

router.get(
  '/teacher',
  requireRole('TEACHER'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await assignmentService.listTeacherAssignments(req.user!.id);
      res.json({ data });
    } catch (error) {
      handleError(error, res, next);
    }
  }
);

router.post(
  '/',
  requireRole('TEACHER'),
  validate(createAssignmentSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await assignmentService.createAssignment(req.user!.id, req.body);
      res.status(201).json({ data });
    } catch (error) {
      handleError(error, res, next);
    }
  }
);

router.put(
  '/:id/submission',
  requireRole('STUDENT'),
  validate(assignmentIdSchema, 'params'),
  validate(submitAssignmentSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await assignmentService.submitAssignment(
        req.user!.id,
        req.params.id as string,
        req.body.driveUrl
      );
      res.status(201).json({ data });
    } catch (error) {
      handleError(error, res, next);
    }
  }
);

router.patch(
  '/submissions/:submissionId/review',
  requireRole('TEACHER'),
  validate(submissionIdSchema, 'params'),
  validate(gradeSubmissionSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await assignmentService.gradeSubmission(
        req.user!.id,
        req.params.submissionId as string,
        req.body
      );
      res.json({ data });
    } catch (error) {
      handleError(error, res, next);
    }
  }
);

router.post(
  '/submissions/:submissionId/sign-off',
  requireRole('TEACHER'),
  validate(submissionIdSchema, 'params'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await assignmentService.signOffSubmission(
        req.user!.id,
        req.params.submissionId as string
      );
      res.json({ data });
    } catch (error) {
      handleError(error, res, next);
    }
  }
);

export default router;
