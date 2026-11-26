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
export async function getAcademicYears() {
  return prisma.academicYear.findMany({ orderBy: [{ isCurrent: 'desc' }, { startDate: 'desc' }] });
}

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
      course: { include: { department: true } },
      _count: { select: { students: true } },
    },
  });
}

export async function createSection(data: SectionInput) {
  return prisma.section.create({ data });
}

export async function toggleSectionFaceAttendance(id: number, isFaceAttendanceEnabled: boolean) {
  return prisma.section.update({
    where: { id },
    data: { isFaceAttendanceEnabled },
  });
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
  const allocation = await prisma.teacherSubject.findUnique({
    where: {
      teacherId_subjectId_sectionId: {
        teacherId: data.teacherId,
        subjectId: data.subjectId,
        sectionId: data.sectionId,
      },
    },
  });
  if (!allocation) {
    throw { code: 'CLASS_NOT_ASSIGNED', status: 403, message: 'Assign this teacher to the selected subject and section before scheduling.' };
  }

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

  if (data.roomNo) {
    const existingRoomSlot = await prisma.timetableSlot.findFirst({
      where: {
        roomNo: { equals: data.roomNo, mode: 'insensitive' },
        dayOfWeek: data.dayOfWeek,
        period: data.period,
        academicYearId: data.academicYearId,
      },
    });
    if (existingRoomSlot) {
      throw { code: 'ROOM_CLASH', status: 409, message: 'The selected room is already booked for this period.' };
    }
  }

  return prisma.timetableSlot.create({ data });
}

export async function deleteTimetableSlot(id: number) {
  return prisma.timetableSlot.delete({ where: { id } });
}

export async function preGenerateTodaySessions() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  const jsDay = istNow.getUTCDay();
  const dayOfWeek = jsDay === 0 ? 7 : jsDay;
  const todayDateStr = istNow.toISOString().slice(0, 10);
  const todayDate = new Date(todayDateStr);

  const slots = await prisma.timetableSlot.findMany({
    where: { dayOfWeek },
  });

  const createdSessions = [];
  for (const slot of slots) {
    const existing = await prisma.attendanceSession.findFirst({
      where: {
        sectionId: slot.sectionId,
        subjectId: slot.subjectId,
        period: slot.period,
        date: todayDate,
      },
    });
    if (!existing) {
      const session = await prisma.attendanceSession.create({
        data: {
          teacherId: slot.teacherId,
          sectionId: slot.sectionId,
          subjectId: slot.subjectId,
          period: slot.period,
          date: todayDate,
          status: 'OPEN',
        },
      });
      createdSessions.push(session);
    }
  }

  return {
    date: todayDateStr,
    dayOfWeek,
    totalSlots: slots.length,
    sessionsCreated: createdSessions.length,
  };
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
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  const jsDay = istNow.getUTCDay();
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
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  const jsDay = istNow.getUTCDay();
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
// --- Teacher Assigned Classes (Branch + Section + Subject chips) ---
export async function getTeacherAssignedClasses(userId: number) {
  const teacher = await prisma.teacher.findUnique({
    where: { userId },
    include: {
      subjects: {
        include: {
          subject: true,
          section: {
            include: {
              course: {
                include: { department: true },
              },
            },
          },
        },
      },
    },
  });

  if (!teacher) return [];

  const seen = new Set<string>();
  const chips = teacher.subjects
    .filter((ts) => {
      const key = `${ts.sectionId}-${ts.subjectId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((ts) => ({
      sectionId: ts.sectionId,
      sectionName: ts.section.name,
      sectionYear: ts.section.year,
      courseCode: ts.section.course.code,
      courseName: ts.section.course.name,
      departmentName: ts.section.course.department.name,
      subjectId: ts.subjectId,
      subjectName: ts.subject.name,
      subjectCode: ts.subject.code,
    }));

  return chips;
}