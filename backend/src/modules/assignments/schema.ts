import { z } from 'zod';

export const createAssignmentSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(1).max(5000),
  sectionId: z.coerce.number().int().positive(),
  subjectId: z.coerce.number().int().positive(),
  maxMarks: z.coerce.number().finite().positive().max(1000),
  dueAt: z.string().datetime().optional().nullable(),
});

export const submitAssignmentSchema = z.object({
  driveUrl: z.string().trim().min(1).max(2048),
});

export const gradeSubmissionSchema = z.object({
  marks: z.coerce.number().finite().nonnegative(),
  feedback: z.string().trim().max(2000).optional(),
});

export const assignmentIdSchema = z.object({
  id: z.string().uuid(),
});

export const submissionIdSchema = z.object({
  submissionId: z.string().uuid(),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type GradeSubmissionInput = z.infer<typeof gradeSubmissionSchema>;
