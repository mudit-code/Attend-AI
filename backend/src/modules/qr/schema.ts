import { z } from 'zod';

export const startQrSchema = z.object({
  sessionId: z.string().uuid(),
  durationMinutes: z.number().int().min(1).max(120).default(50),
});

export const markQrSchema = z.object({
  sessionId: z.string().uuid(),
  token: z.string().min(6),
  deviceId: z.string().min(6),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export type StartQrInput = z.infer<typeof startQrSchema>;
export type MarkQrInput = z.infer<typeof markQrSchema>;
