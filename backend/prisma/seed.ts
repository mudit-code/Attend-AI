import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Academic Year ───────────────────────────────────────────────
  const academicYear = await prisma.academicYear.upsert({
    where: { id: 1 },
    update: {},
    create: {
      label: '2026-27',
      startDate: new Date('2026-07-01'),
      endDate: new Date('2027-05-31'),
      isCurrent: true,
    },
  });
  console.log('✅ Academic year:', academicYear.label);

  // ─── Admin User ──────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('Admin@123', 12);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@attendai.com' },
    update: {},
    create: {
      email: 'admin@attendai.com',
      phone: '+919000000001',
      passwordHash: adminPassword,
      role: 'ADMIN',
      name: 'System Admin',
    },
  });
  console.log('✅ Admin user:', adminUser.email);

  // ─── Department ──────────────────────────────────────────────────
  const dept = await prisma.department.upsert({
    where: { code: 'CS' },
    update: {},
    create: {
      name: 'Computer Science',
      code: 'CS',
      academicYearId: academicYear.id,
    },
  });
  console.log('✅ Department:', dept.name);

  // ─── Course ──────────────────────────────────────────────────────
  const course = await prisma.course.upsert({
    where: { code: 'BCA' },
    update: {},
    create: {
      name: 'Bachelor of Computer Applications',
      code: 'BCA',
      durationYears: 3,
      departmentId: dept.id,
      academicYearId: academicYear.id,
    },
  });
  console.log('✅ Course:', course.name);

  // ─── Section ─────────────────────────────────────────────────────
  const section = await prisma.section.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: '3rd Year A',
      year: 3,
      courseId: course.id,
      academicYearId: academicYear.id,
    },
  });
  console.log('✅ Section:', section.name);

  // ─── 3 Teachers ──────────────────────────────────────────────────
  const teacherData = [
    { email: 'teacher1@attendai.com', name: 'Ramesh Kumar', empCode: 'T001' },
    { email: 'teacher2@attendai.com', name: 'Priya Sharma', empCode: 'T002' },
    { email: 'teacher3@attendai.com', name: 'Anita Singh', empCode: 'T003' },
  ];

  const teacherPassword = await bcrypt.hash('Teacher@123', 12);
  const teachers = [];

  for (const t of teacherData) {
    const user = await prisma.user.upsert({
      where: { email: t.email },
      update: {},
      create: {
        email: t.email,
        passwordHash: teacherPassword,
        role: 'TEACHER',
        name: t.name,
      },
    });

    const teacher = await prisma.teacher.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        employeeCode: t.empCode,
        departmentId: dept.id,
      },
    });
    teachers.push(teacher);
  }
  console.log('✅ 3 Teachers created');

  // ─── HOD User ─────────────────────────────────────────────────────
  const hodPassword = await bcrypt.hash('Hod@123', 12);
  const hodUser = await prisma.user.upsert({
    where: { email: 'hod.cs@attendai.com' },
    update: { role: 'HOD' },
    create: {
      email: 'hod.cs@attendai.com',
      phone: '+919000000002',
      passwordHash: hodPassword,
      role: 'HOD',
      name: 'Dr. Rajesh Gupta (HOD CS)',
    },
  });

  await prisma.teacher.upsert({
    where: { userId: hodUser.id },
    update: { departmentId: dept.id },
    create: {
      userId: hodUser.id,
      employeeCode: 'HOD001',
      departmentId: dept.id,
    },
  });
  console.log('✅ HOD user created:', hodUser.email);

  // ─── Subjects ────────────────────────────────────────────────────
  const subjectData = [
    { name: 'Data Structures', code: 'CS301' },
    { name: 'Database Management', code: 'CS302' },
    { name: 'Operating Systems', code: 'CS303' },
  ];

  const subjects = [];
  for (const s of subjectData) {
    const subject = await prisma.subject.upsert({
      where: { code: s.code },
      update: {},
      create: s,
    });
    subjects.push(subject);
  }
  console.log('✅ 3 Subjects created');

  // ─── Teacher-Subject Allocations ─────────────────────────────────
  for (let i = 0; i < teachers.length; i++) {
    await prisma.teacherSubject.upsert({
      where: {
        teacherId_subjectId_sectionId: {
          teacherId: teachers[i].id,
          subjectId: subjects[i].id,
          sectionId: section.id,
        },
      },
      update: {},
      create: {
        teacherId: teachers[i].id,
        subjectId: subjects[i].id,
        sectionId: section.id,
      },
    });
  }
  console.log('✅ Teacher-subject allocations done');

  // ─── Attendance Rules ─────────────────────────────────────────────
  await prisma.attendanceRule.upsert({
    where: { id: 1 },
    update: {},
    create: {
      minPercent: 75,
      lateGraceMinutes: 10,
      editWindowHours: 24,
      countLeaveAsPresent: false,
    },
  });
  console.log('✅ Attendance rules set (75% minimum)');

  // ─── 50 Students ─────────────────────────────────────────────────
  const studentPassword = await bcrypt.hash('Student@123', 12);

  for (let i = 1; i <= 50; i++) {
    const rollNo = `BCA3A${String(i).padStart(3, '0')}`;
    const email = `student${i}@attendai.com`;

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        passwordHash: studentPassword,
        role: 'STUDENT',
        name: `Student ${i}`,
      },
    });

    await prisma.student.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        rollNo,
        sectionId: section.id,
      },
    });
  }
  console.log('✅ 50 Students created');

  // ─── Timetable (Mon-Fri, 3 periods) ──────────────────────────────
  const days = [1, 2, 3, 4, 5]; // Mon-Fri
  const periods = [
    { period: 1, start: '09:00', end: '09:55' },
    { period: 2, start: '10:00', end: '10:55' },
    { period: 3, start: '11:00', end: '11:55' },
  ];

  for (const day of days) {
    for (let p = 0; p < periods.length; p++) {
      await prisma.timetableSlot.upsert({
        where: {
          sectionId_dayOfWeek_period_academicYearId: {
            sectionId: section.id,
            dayOfWeek: day,
            period: periods[p].period,
            academicYearId: academicYear.id,
          },
        },
        update: {},
        create: {
          sectionId: section.id,
          subjectId: subjects[p % subjects.length].id,
          teacherId: teachers[p % teachers.length].id,
          dayOfWeek: day,
          period: periods[p].period,
          startTime: periods[p].start,
          endTime: periods[p].end,
          academicYearId: academicYear.id,
        },
      });
    }
  }
  console.log('✅ Timetable created (Mon-Fri, 3 periods/day)');

  console.log('\n🎉 Seed complete!');
  console.log('\n📋 Login credentials:');
  console.log('  Admin:    admin@attendai.com     / Admin@123');
  console.log('  HOD:      hod.cs@attendai.com    / Hod@123');
  console.log('  Teacher:  teacher1@attendai.com  / Teacher@123');
  console.log('  Student:  student1@attendai.com  / Student@123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
