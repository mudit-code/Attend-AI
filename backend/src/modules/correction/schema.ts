import { z } from 'zod';

export const createCorrectionSchema = z.object({
  sessionId: z.string().uuid(),
  requestedStatus: z.enum(['P', 'L', 'LV', 'OD']),
  reason: z.string().min(5),
  documentUrl: z.string().url().optional(),
});

export const decideCorrectionSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  note: z.string().min(3).optional(),
});

export type CreateCorrectionInput = z.infer<typeof createCorrectionSchema>;
export type DecideCorrectionInput = z.infer<typeof decideCorrectionSchema>;
