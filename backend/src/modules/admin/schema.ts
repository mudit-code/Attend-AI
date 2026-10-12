import { z } from 'zod';

export const updateRulesSchema = z.object({
  minPercent: z.number().min(0).max(100),
  lateGraceMinutes: z.number().int().min(0).max(60),
  editWindowHours: z.number().int().min(1).max(168),
  countLeaveAsPresent: z.boolean(),
});

export type UpdateRulesInput = z.infer<typeof updateRulesSchema>;
