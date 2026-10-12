import { prisma } from '../../lib/prisma';
import type { AuthRequest } from '../../middlewares/auth';
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

// ─── Period Time Helper ───────────────────────────────────────────
function getCurrentPeriodInfo(slots: { startTime: string; endTime: string; period: number }[]) {
  const now = new Date();
  // Convert to IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  const currentHHMM = istNow.toISOString().slice(11, 16); // "HH:MM"

  let currentPeriod: number | null = null;
  let nextPeriod: number | null = null;

  const sorted = [...slots].sort((a, b) => a.period - b.period);

  for (const slot of sorted) {
    if (currentHHMM >= slot.startTime && currentHHMM <= slot.endTime) {
      currentPeriod = slot.period;
    } else if (currentHHMM < slot.startTime && nextPeriod === null) {
      nextPeriod = slot.period;
    }
  }

  return { currentPeriod, nextPeriod, currentTime: currentHHMM };
}

// ─── Today's Timetable for Student ──────────────────────────────
export async function getTodayTimetable(req: AuthRequest) {
  const user = req.user!;
  let sectionId: number;

  if (user.role === 'STUDENT') {
    const student = await prisma.student.findUnique({ where: { userId: user.id } });
    if (!student) throw { code: 'NOT_FOUND', status: 404, message: 'Student not found' };
    sectionId = student.sectionId;
  } else {
    throw { code: 'FORBIDDEN', status: 403, message: 'Only students can access this endpoint' };
  }

  const now = new Date();
  // JS getDay(): 0=Sun, 1=Mon...6=Sat. Map to 1=Mon...7=Sun
  const jsDay = now.getDay();
  const dayOfWeek = jsDay === 0 ? 7 : jsDay;

  const slots = await prisma.timetableSlot.findMany({
    where: { sectionId, dayOfWeek },
    include: {
      section: true,
    },
    orderBy: { period: 'asc' },
  });

  // Fetch subject and teacher details per slot (TimetableSlot doesn't have relations for subject/teacher in include by default)
  const slotsWithDetails = await Promise.all(
    slots.map(async (slot) => {
      const [subject, teacher] = await Promise.all([
        prisma.subject.findUnique({ where: { id: slot.subjectId } }),
        prisma.teacher.findUnique({ where: { id: slot.teacherId }, include: { user: { select: { name: true } } } }),
      ]);
      return {
        period: slot.period,
        startTime: slot.startTime,
        endTime: slot.endTime,
        roomNo: slot.roomNo,
        subject: subject ? { id: subject.id, name: subject.name, code: subject.code } : null,
        teacher: teacher ? { id: teacher.id, name: teacher.user.name } : null,
      };
    })
  );

  const { currentPeriod, nextPeriod, currentTime } = getCurrentPeriodInfo(slotsWithDetails.map(s => ({ startTime: s.startTime, endTime: s.endTime, period: s.period })));

  return {
    dayOfWeek,
    currentTime,
    currentPeriod,
    nextPeriod,
    slots: slotsWithDetails,
  };
}

// ─── Today's Timetable for Teacher ──────────────────────────────
export async function getTeacherTodayTimetable(req: AuthRequest) {
  const user = req.user!;
  const teacher = await prisma.teacher.findUnique({ where: { userId: user.id } });
  if (!teacher) throw { code: 'NOT_FOUND', status: 404, message: 'Teacher not found' };

  const now = new Date();
  const jsDay = now.getDay();
  const dayOfWeek = jsDay === 0 ? 7 : jsDay;

  const slots = await prisma.timetableSlot.findMany({
    where: { teacherId: teacher.id, dayOfWeek },
    include: { section: true },
    orderBy: { period: 'asc' },
  });

  const slotsWithDetails = await Promise.all(
    slots.map(async (slot) => {
      const subject = await prisma.subject.findUnique({ where: { id: slot.subjectId } });
      return {
        period: slot.period,
        startTime: slot.startTime,
        endTime: slot.endTime,
        roomNo: slot.roomNo,
        subject: subject ? { id: subject.id, name: subject.name, code: subject.code } : null,
        section: { id: slot.section.id, name: slot.section.name },
        sectionId: slot.sectionId,
      };
    })
  );

  const { currentPeriod, nextPeriod, currentTime } = getCurrentPeriodInfo(
    slotsWithDetails.map(s => ({ startTime: s.startTime, endTime: s.endTime, period: s.period }))
  );

  return { dayOfWeek, currentTime, currentPeriod, nextPeriod, teacherId: teacher.id, slots: slotsWithDetails };
}

