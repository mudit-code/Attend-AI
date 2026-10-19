import { prisma } from '../../lib/prisma';

// ─── Student Attendance Report ────────────────────────────────────
export async function getStudentReport(studentId: number) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      section: { include: { course: { include: { department: true } } } },
    },
  });

  if (!student) {
    throw { code: 'NOT_FOUND', status: 404, message: 'Student not found' };
  }

  const rules = await prisma.attendanceRule.findFirst();
  const countLeave = rules?.countLeaveAsPresent ?? false;
  const minPercent = rules?.minPercent ?? 75;

  const records = await prisma.attendanceRecord.findMany({
    where: { studentId },
    include: {
      session: {
        include: {
          subject: true,
          teacher: { include: { user: { select: { name: true } } } },
        },
      },
    },
    orderBy: { session: { date: 'asc' } },
  });

  const totalClasses = records.length;
  let presentCount = 0;
  let absentCount = 0;
  let lateCount = 0;
  let leaveCount = 0;
  let onDutyCount = 0;

  // Group by subject
  const subjectMap = new Map<
    number,
    {
      subjectId: number;
      subjectName: string;
      subjectCode: string;
      total: number;
      present: number;
      absent: number;
      late: number;
      leave: number;
      od: number;
    }
  >();

  for (const r of records) {
    const sId = r.session.subjectId;
    if (!subjectMap.has(sId)) {
      subjectMap.set(sId, {
        subjectId: sId,
        subjectName: r.session.subject.name,
        subjectCode: r.session.subject.code,
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        leave: 0,
        od: 0,
      });
    }

    const sub = subjectMap.get(sId)!;
    sub.total++;

    switch (r.status) {
      case 'P':
        presentCount++;
        sub.present++;
        break;
      case 'A':
        absentCount++;
        sub.absent++;
        break;
      case 'L':
        lateCount++;
        sub.late++;
        break;
      case 'LV':
        leaveCount++;
        sub.leave++;
        break;
      case 'OD':
        onDutyCount++;
        sub.od++;
        break;
    }
  }

  // Attendance % formula: (P + OD [+LV if enabled]) / totalClasses * 100
  const effectivePresent = presentCount + onDutyCount + (countLeave ? leaveCount : 0);
  const overallPercentage = totalClasses > 0 ? Number(((effectivePresent / totalClasses) * 100).toFixed(1)) : 100;

  const subjectBreakdown = Array.from(subjectMap.values()).map((sub) => {
    const subEffective = sub.present + sub.od + (countLeave ? sub.leave : 0);
    const pct = sub.total > 0 ? Number(((subEffective / sub.total) * 100).toFixed(1)) : 100;
    return {
      ...sub,
      percentage: pct,
      isDefaulter: pct < minPercent,
    };
  });

  // Recent attendance history for calendar / list
  const history = records.map((r) => ({
    id: r.id,
    sessionId: r.sessionId,
    date: r.session.date,
    period: r.session.period,
    subject: r.session.subject.name,
    teacher: r.session.teacher.user.name,
    status: r.status,
    method: r.method,
  }));

  return {
    student,
    summary: {
      totalClasses,
      present: presentCount,
      absent: absentCount,
      late: lateCount,
      leave: leaveCount,
      onDuty: onDutyCount,
      percentage: overallPercentage,
      isDefaulter: overallPercentage < minPercent,
      minRequired: minPercent,
    },
    subjects: subjectBreakdown,
    history,
  };
}

// ─── Class Attendance Report (Optimized Bulk Query) ───────────────
export async function getClassReport(sectionId: number, subjectId?: number) {
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    include: { course: { include: { department: true } } },
  });

  if (!section) {
    throw { code: 'NOT_FOUND', status: 404, message: 'Section not found' };
  }

  const rules = await prisma.attendanceRule.findFirst();
  const countLeave = rules?.countLeaveAsPresent ?? false;
  const minPercent = rules?.minPercent ?? 75;

  const students = await prisma.student.findMany({
    where: { sectionId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { rollNo: 'asc' },
  });

  const studentIds = students.map((s) => s.id);

  // Bulk fetch all attendance records for students in this section in a single query
  const records = await prisma.attendanceRecord.findMany({
    where: {
      studentId: { in: studentIds },
      ...(subjectId ? { session: { subjectId } } : {}),
    },
    select: {
      studentId: true,
      status: true,
    },
  });

  // Aggregate in-memory (O(N) operation)
  const statsMap = new Map<number, { total: number; present: number; absent: number; late: number; leave: number; od: number }>();
  for (const id of studentIds) {
    statsMap.set(id, { total: 0, present: 0, absent: 0, late: 0, leave: 0, od: 0 });
  }

  for (const r of records) {
    const s = statsMap.get(r.studentId);
    if (!s) continue;
    s.total++;
    if (r.status === 'P') s.present++;
    else if (r.status === 'A') s.absent++;
    else if (r.status === 'L') s.late++;
    else if (r.status === 'LV') s.leave++;
    else if (r.status === 'OD') s.od++;
  }

  const studentSummaries = [];
  let totalPercentSum = 0;

  for (const st of students) {
    const s = statsMap.get(st.id) || { total: 0, present: 0, absent: 0, late: 0, leave: 0, od: 0 };
    const effectivePresent = s.present + s.od + (countLeave ? s.leave : 0);
    const pct = s.total > 0 ? Number(((effectivePresent / s.total) * 100).toFixed(1)) : 100;
    totalPercentSum += pct;

    studentSummaries.push({
      studentId: st.id,
      name: st.user.name,
      rollNo: st.rollNo,
      totalClasses: s.total,
      present: s.present,
      absent: s.absent,
      percentage: pct,
      isDefaulter: pct < minPercent,
    });
  }

  const averagePercentage =
    students.length > 0 ? Number((totalPercentSum / students.length).toFixed(1)) : 100;

  return {
    section,
    totalStudents: students.length,
    classAverage: averagePercentage,
    students: studentSummaries,
  };
}

// ─── Defaulters List (Optimized Bulk Query) ────────────────────────
export async function getDefaulters(minPercent = 75, sectionId?: number, departmentId?: number) {
  const rules = await prisma.attendanceRule.findFirst();
  const countLeave = rules?.countLeaveAsPresent ?? false;
  const threshold = rules?.minPercent ?? minPercent;

  const students = await prisma.student.findMany({
    where: {
      ...(sectionId ? { sectionId } : {}),
      ...(departmentId ? { section: { course: { departmentId } } } : {}),
    },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      section: { include: { course: true } },
    },
    orderBy: { rollNo: 'asc' },
  });

  const studentIds = students.map((s) => s.id);

  // Bulk query all attendance records in one single database round trip
  const records = await prisma.attendanceRecord.findMany({
    where: { studentId: { in: studentIds } },
    select: {
      studentId: true,
      status: true,
    },
  });

  const statsMap = new Map<number, { total: number; present: number; od: number; leave: number }>();
  for (const id of studentIds) {
    statsMap.set(id, { total: 0, present: 0, od: 0, leave: 0 });
  }

  for (const r of records) {
    const s = statsMap.get(r.studentId);
    if (!s) continue;
    s.total++;
    if (r.status === 'P') s.present++;
    else if (r.status === 'OD') s.od++;
    else if (r.status === 'LV') s.leave++;
  }

  const defaulters = [];

  for (const st of students) {
    const s = statsMap.get(st.id) || { total: 0, present: 0, od: 0, leave: 0 };
    if (s.total > 0) {
      const effectivePresent = s.present + s.od + (countLeave ? s.leave : 0);
      const percentage = Number(((effectivePresent / s.total) * 100).toFixed(1));
      if (percentage < threshold) {
        defaulters.push({
          studentId: st.id,
          name: st.user.name,
          email: st.user.email,
          phone: st.user.phone,
          rollNo: st.rollNo,
          section: st.section.name,
          course: st.section.course.name,
          totalClasses: s.total,
          attended: s.present + s.od,
          percentage,
          shortage: (threshold - percentage).toFixed(1) + '%',
        });
      }
    }
  }

  return {
    threshold,
    totalDefaulters: defaulters.length,
    defaulters,
  };
}

// ─── Export Report Data (CSV) ─────────────────────────────────────
export async function exportDefaultersCSV(minPercent = 75, sectionId?: number, departmentId?: number) {
  const { defaulters } = await getDefaulters(minPercent, sectionId, departmentId);

  const header = 'Roll No,Student Name,Section,Course,Total Classes,Attended,Attendance %,Shortage\n';
  const rows = defaulters.map((d) =>
    `"${d.rollNo}","${d.name}","${d.section}","${d.course}",${d.totalClasses},${d.attended},${d.percentage}%,${d.shortage}`
  );

  return header + rows.join('\n');
}
