import { z } from 'zod';

export const applyGatePassSchema = z.object({
  reason: z.enum([
    'MEDICAL_EMERGENCY',
    'DOCTOR_APPOINTMENT',
    'FAMILY_EMERGENCY',
    'BANK_WORK',
    'COURT_LEGAL',
    'TRAVEL',
    'PERSONAL',
    'OTHER',
  ]),
  reasonOther: z.string().optional(),
  destination: z.string().min(5, 'Destination must be at least 5 characters'),
  additionalNote: z.string().optional(),
  documentUrl: z.string().url().optional().or(z.literal('')),
  outTime: z.string().datetime({ message: 'Invalid outTime format' }),
  expectedInTime: z.string().datetime({ message: 'Invalid expectedInTime format' }),
}).refine(
  (data) => data.reason !== 'OTHER' || (data.reasonOther && data.reasonOther.trim().length > 0),
  { message: 'Please specify reason when selecting OTHER', path: ['reasonOther'] }
).refine(
  (data) => new Date(data.expectedInTime) > new Date(data.outTime),
  { message: 'Return time must be after out time', path: ['expectedInTime'] }
);

export const mentorDecisionSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  note: z.string().optional(),
});

export const hodDecisionSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  note: z.string().optional(),
});

export const guardScanSchema = z.object({
  rawToken: z.string().min(1, 'Token required'),
});
