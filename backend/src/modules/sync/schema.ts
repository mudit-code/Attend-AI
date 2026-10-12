import { z } from 'zod';

export const pushBatchItemSchema = z.object({
  clientMutationId: z.string().min(1),
  entity: z.enum(['attendance', 'leave', 'correction']),
  action: z.enum(['create', 'update']),
  payload: z.record(z.string(), z.any()),
});

export const pushBatchSchema = z.object({
  batchId: z.string().min(1),
  items: z.array(pushBatchItemSchema).max(50),
});

export const pullQuerySchema = z.object({
  cursor: z.string().optional().default('0'),
  sectionId: z.string().optional(),
});

export type PushBatchInput = z.infer<typeof pushBatchSchema>;
export type PushBatchItem = z.infer<typeof pushBatchItemSchema>;
export type PullQueryInput = z.infer<typeof pullQuerySchema>;
