import { z } from 'zod';

export const createSessionSchema = z.object({
  sectionId: z.number().int().positive(),
  subjectId: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period: z.number().int().min(1).max(10),
});

export const markRecordsSchema = z.object({
  records: z.array(
    z.object({
      studentId: z.number().int().positive(),
      status: z.enum(['P', 'A', 'L', 'LV', 'OD']),
      method: z.enum(['MANUAL', 'QR', 'FACE']).default('MANUAL'),
      clientTs: z.string().optional(),
    })
  ).min(1),
});

export const updateRecordSchema = z.object({
  status: z.enum(['P', 'A', 'L', 'LV', 'OD']),
  method: z.enum(['MANUAL', 'QR', 'FACE']).optional(),
  reason: z.string().min(3).optional(),
});

export const unlockSessionSchema = z.object({
  reason: z.string().min(5),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type MarkRecordsInput = z.infer<typeof markRecordsSchema>;
export type UpdateRecordInput = z.infer<typeof updateRecordSchema>;
export type UnlockSessionInput = z.infer<typeof unlockSessionSchema>;
