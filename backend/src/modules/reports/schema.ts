import { z } from 'zod';

export const classReportQuerySchema = z.object({
  sectionId: z.string().transform(Number),
  subjectId: z.string().optional(),
  fromMonth: z.string().optional(),
  toMonth: z.string().optional(),
});

export const defaultersQuerySchema = z.object({
  sectionId: z.string().optional(),
  departmentId: z.string().optional(),
  minPercent: z.string().optional().default('75'),
});

export type ClassReportQuery = z.infer<typeof classReportQuerySchema>;
export type DefaultersQuery = z.infer<typeof defaultersQuerySchema>;
