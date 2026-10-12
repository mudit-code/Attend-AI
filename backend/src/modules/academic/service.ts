import { prisma } from '../../lib/prisma';
import type {
  DepartmentInput,
  CourseInput,
  SectionInput,
  SubjectInput,
  TeacherSubjectInput,
  TimetableSlotInput,
  HolidayInput,
} from './schema';

// ─── Departments ──────────────────────────────────────────────────
export async function getDepartments() {
  return prisma.department.findMany({
    include: {
      courses: true,
      academicYear: true,
      teachers: { select: { id: true, user: { select: { name: true, email: true } } } },
    },
  });
}

export async function createDepartment(data: DepartmentInput) {
  return prisma.department.create({ data });
}

// ─── Courses ──────────────────────────────────────────────────────
export async function getCourses(departmentId?: number) {
  return prisma.course.findMany({
    where: departmentId ? { departmentId } : undefined,
    include: { sections: true, department: true },
  });
}

export async function createCourse(data: CourseInput) {
  return prisma.course.create({ data });
}

// ─── Sections ─────────────────────────────────────────────────────
export async function getSections(courseId?: number) {
  return prisma.section.findMany({
    where: courseId ? { courseId } : undefined,
    include: {
      course: true,
      _count: { select: { students: true } },
    },
  });
}

export async function createSection(data: SectionInput) {
  return prisma.section.create({ data });
}

// ─── Subjects ─────────────────────────────────────────────────────
export async function getSubjects() {
  return prisma.subject.findMany({
    include: {
      teacherSubjects: {
        include: {
          teacher: { select: { id: true, user: { select: { name: true } } } },
          section: { select: { id: true, name: true } },
        },
      },
    },
  });
}

export async function createSubject(data: SubjectInput) {
  return prisma.subject.create({ data });
}

// ─── Teacher Subject Allocation ──────────────────────────────────
export async function assignTeacherSubject(data: TeacherSubjectInput) {
  return prisma.teacherSubject.upsert({
    where: {
      teacherId_subjectId_sectionId: {
        teacherId: data.teacherId,
        subjectId: data.subjectId,
        sectionId: data.sectionId,
      },
    },
    update: {},
    create: data,
  });
}

// ─── Timetable Slots with Clash Check ─────────────────────────────
export async function getTimetableSlots(sectionId?: number, teacherId?: number) {
  return prisma.timetableSlot.findMany({
    where: {
      ...(sectionId ? { sectionId } : {}),
      ...(teacherId ? { teacherId } : {}),
    },
    include: {
      section: true,
      academicYear: true,
    },
    orderBy: [{ dayOfWeek: 'asc' }, { period: 'asc' }],
  });
}

export async function createTimetableSlot(data: TimetableSlotInput) {
  // Check section slot conflict
  const existingSectionSlot = await prisma.timetableSlot.findFirst({
    where: {
      sectionId: data.sectionId,
      dayOfWeek: data.dayOfWeek,
      period: data.period,
      academicYearId: data.academicYearId,
    },
  });
  if (existingSectionSlot) {
    throw { code: 'SECTION_CLASH', status: 409, message: 'Section already has a class scheduled at this period' };
  }

  // Check teacher slot conflict
  const existingTeacherSlot = await prisma.timetableSlot.findFirst({
    where: {
      teacherId: data.teacherId,
      dayOfWeek: data.dayOfWeek,
      period: data.period,
      academicYearId: data.academicYearId,
    },
  });
  if (existingTeacherSlot) {
    throw { code: 'TEACHER_CLASH', status: 409, message: 'Teacher already has another class scheduled at this period' };
  }

  return prisma.timetableSlot.create({ data });
}

// ─── Holidays ─────────────────────────────────────────────────────
export async function getHolidays() {
  return prisma.holiday.findMany({
    orderBy: { date: 'asc' },
  });
}

export async function createHoliday(data: HolidayInput) {
  return prisma.holiday.upsert({
    where: { date: data.date },
    update: { name: data.name, type: data.type },
    create: data,
  });
}
