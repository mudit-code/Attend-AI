import { z } from 'zod';

export const createStudentSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  rollNo: z.string().min(2).max(20),
  sectionId: z.number().int().positive(),
  password: z.string().min(6).default('Student@123'),
});

export const createTeacherSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  employeeCode: z.string().min(2).max(20),
  departmentId: z.number().int().positive(),
  isClassTeacher: z.boolean().default(false),
  classTeacherSectionId: z.number().int().positive().optional(),
  password: z.string().min(6).default('Teacher@123'),
});

export const bulkStudentSchema = z.object({
  students: z.array(
    z.object({
      name: z.string().min(2),
      email: z.string().email(),
      phone: z.string().optional(),
      rollNo: z.string().min(2).max(20),
      sectionId: z.number().int().positive(),
      password: z.string().min(6).optional(),
    })
  ).min(1).max(500),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type CreateTeacherInput = z.infer<typeof createTeacherSchema>;
export type BulkStudentInput = z.infer<typeof bulkStudentSchema>;
