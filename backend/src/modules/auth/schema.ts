import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const refreshSchema = z.object({
  // refresh token comes from HttpOnly cookie — nothing in body
});

export const otpSendSchema = z.object({
  phone: z.string().regex(/^\+?[0-9]{10,13}$/, 'Invalid phone number').optional(),
  email: z.string().email().optional(),
}).refine((d) => d.phone || d.email, { message: 'phone or email required' });

export const otpVerifySchema = z.object({
  parentId: z.number().int().positive(),
  otp: z.string().length(6),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type OtpSendInput = z.infer<typeof otpSendSchema>;
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.literal('STUDENT'),
  rollNo: z.string().min(2).max(20),
  sectionId: z.number().int().positive(),
  phone: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

