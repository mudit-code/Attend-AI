import { z } from 'zod';

export const departmentSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(10),
  academicYearId: z.number().int().positive(),
  hodId: z.number().int().positive().optional(),
});

export const courseSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(10),
  durationYears: z.number().int().min(1).max(5).default(3),
  departmentId: z.number().int().positive(),
  academicYearId: z.number().int().positive(),
});

export const sectionSchema = z.object({
  name: z.string().min(1),
  year: z.number().int().min(1).max(5),
  courseId: z.number().int().positive(),
  academicYearId: z.number().int().positive(),
});

export const subjectSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(15),
});

export const teacherSubjectSchema = z.object({
  teacherId: z.number().int().positive(),
  subjectId: z.number().int().positive(),
  sectionId: z.number().int().positive(),
});

export const timetableSlotSchema = z.object({
  sectionId: z.number().int().positive(),
  subjectId: z.number().int().positive(),
  teacherId: z.number().int().positive(),
  dayOfWeek: z.number().int().min(1).max(7),
  period: z.number().int().min(1).max(10),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  roomNo: z.string().trim().min(1).max(50).optional(),
  academicYearId: z.number().int().positive(),
}).refine((data) => data.startTime < data.endTime, {
  message: 'End time must be after start time',
  path: ['endTime'],
});

export const holidaySchema = z.object({
  date: z.string().transform((val) => new Date(val)),
  name: z.string().min(2),
  type: z.enum(['national', 'college', 'exam']).default('college'),
});

export type DepartmentInput = z.infer<typeof departmentSchema>;
export type CourseInput = z.infer<typeof courseSchema>;
export type SectionInput = z.infer<typeof sectionSchema>;
export type SubjectInput = z.infer<typeof subjectSchema>;
export type TeacherSubjectInput = z.infer<typeof teacherSubjectSchema>;
export type TimetableSlotInput = z.infer<typeof timetableSlotSchema>;
export type HolidayInput = z.infer<typeof holidaySchema>;
