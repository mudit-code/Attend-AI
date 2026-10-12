import { z } from 'zod';

export const createLeaveSchema = z.object({
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(['MEDICAL', 'PERSONAL', 'EVENT', 'OD']),
  reason: z.string().min(5),
  documentUrl: z.string().url().optional(),
});

export const decideLeaveSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  note: z.string().min(3).optional(),
});

export type CreateLeaveInput = z.infer<typeof createLeaveSchema>;
export type DecideLeaveInput = z.infer<typeof decideLeaveSchema>;
