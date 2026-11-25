import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import type { CreateStudentInput, CreateTeacherInput, BulkStudentInput } from './schema';

// ─── Students ─────────────────────────────────────────────────────
export async function getStudents(sectionId?: number, search?: string) {
  return prisma.student.findMany({
    where: {
      ...(sectionId ? { sectionId } : {}),
      ...(search
        ? {
            OR: [
              { user: { name: { contains: search, mode: 'insensitive' } } },
              { rollNo: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, status: true } },
      section: {
        include: { course: { include: { department: true } } },
      },
    },
    orderBy: { rollNo: 'asc' },
  });
}

export async function createStudent(input: CreateStudentInput) {
  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, ...(input.phone ? [{ phone: input.phone }] : [])] },
  });
  if (existingUser) {
    throw { code: 'USER_EXISTS', status: 409, message: 'User with this email/phone already exists' };
  }

  const existingStudent = await prisma.student.findUnique({
    where: { rollNo: input.rollNo },
  });
  if (existingStudent) {
    throw { code: 'ROLL_EXISTS', status: 409, message: 'Student with this roll number already exists' };
  }

  const section = await prisma.section.findUnique({ where: { id: input.sectionId }, select: { id: true } });
  if (!section) {
    throw { code: 'SECTION_NOT_FOUND', status: 400, message: 'The selected class does not exist.' };
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        passwordHash,
        role: 'STUDENT',
        status: 'ACTIVE',
      },
    });

    const student = await tx.student.create({
      data: {
        userId: user.id,
        rollNo: input.rollNo,
        sectionId: input.sectionId,
      },
      include: { user: true, section: true },
    });

    return student;
  });
}

// ─── Teachers ─────────────────────────────────────────────────────
export async function getTeachers(departmentId?: number) {
  return prisma.teacher.findMany({
    where: departmentId ? { departmentId } : undefined,
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, status: true } },
      department: true,
      subjects: {
        include: { subject: true, section: true },
      },
    },
    orderBy: { employeeCode: 'asc' },
  });
}

export async function createTeacher(input: CreateTeacherInput) {
  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, ...(input.phone ? [{ phone: input.phone }] : [])] },
  });
  if (existingUser) {
    throw { code: 'USER_EXISTS', status: 409, message: 'User with this email/phone already exists' };
  }

  const existingTeacher = await prisma.teacher.findUnique({
    where: { employeeCode: input.employeeCode },
  });
  if (existingTeacher) {
    throw { code: 'EMP_CODE_EXISTS', status: 409, message: 'Teacher with this employee code already exists' };
  }

  const department = await prisma.department.findUnique({ where: { id: input.departmentId }, select: { id: true } });
  if (!department) {
    throw { code: 'DEPARTMENT_NOT_FOUND', status: 400, message: 'The selected department does not exist.' };
  }
  if (input.classTeacherSectionId) {
    const section = await prisma.section.findUnique({ where: { id: input.classTeacherSectionId }, select: { id: true } });
    if (!section) {
      throw { code: 'SECTION_NOT_FOUND', status: 400, message: 'The selected class does not exist.' };
    }
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        passwordHash,
        role: 'TEACHER',
        status: 'ACTIVE',
      },
    });

    const teacher = await tx.teacher.create({
      data: {
        userId: user.id,
        employeeCode: input.employeeCode,
        departmentId: input.departmentId,
        isClassTeacher: input.isClassTeacher,
        classTeacherSectionId: input.classTeacherSectionId,
      },
      include: { user: true, department: true },
    });

    return teacher;
  });
}

// ─── Bulk Student Upload ──────────────────────────────────────────
export async function bulkUploadStudents(input: BulkStudentInput) {
  const section = await prisma.section.findUnique({
    where: { id: input.students[0].sectionId },
    select: { id: true },
  });
  if (!section || input.students.some((student) => student.sectionId !== section.id)) {
    throw { code: 'SECTION_NOT_FOUND', status: 400, message: 'All students must belong to a valid class.' };
  }

  const results = {
    total: input.students.length,
    created: 0,
    errors: [] as { row: number; rollNo: string; error: string }[],
  };

  for (let i = 0; i < input.students.length; i++) {
    const item = input.students[i];
    try {
      const exists = await prisma.student.findUnique({
        where: { rollNo: item.rollNo },
      });
      if (exists) {
        results.errors.push({ row: i + 1, rollNo: item.rollNo, error: 'Roll number already exists' });
        continue;
      }

      const emailExists = await prisma.user.findUnique({
        where: { email: item.email },
      });
      if (emailExists) {
        results.errors.push({ row: i + 1, rollNo: item.rollNo, error: 'Email already exists' });
        continue;
      }

      const passwordHash = await bcrypt.hash(item.password, 10);

      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name: item.name,
            email: item.email,
            phone: item.phone,
            passwordHash,
            role: 'STUDENT',
          },
        });
        await tx.student.create({
          data: {
            userId: user.id,
            rollNo: item.rollNo,
            sectionId: item.sectionId,
          },
        });
      });

      results.created++;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to import student';
      results.errors.push({ row: i + 1, rollNo: item.rollNo, error: message });
    }
  }

  return results;
}
