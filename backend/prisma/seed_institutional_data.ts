import { PrismaClient, AssignmentSubmissionStatus, AttendanceStatus, MarkingMethod, NoticeCategory } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🏛️ Starting AttendAI Institutional Data & Multi-Role Provisioning...');

  // ─── 1. Academic Year ───────────────────────────────────────────────
  const academicYear = await prisma.academicYear.upsert({
    where: { id: 1 },
    update: { isCurrent: true },
    create: {
      label: '2026-27',
      startDate: new Date('2026-07-01'),
      endDate: new Date('2027-05-31'),
      isCurrent: true,
    },
  });
  console.log('✅ Academic Year ready:', academicYear.label);

  // ─── 2. Departments (CSE & ECE) ─────────────────────────────────────
  const deptCSE = await prisma.department.upsert({
    where: { code: 'CS' },
    update: { name: 'Computer Science & Engineering' },
    create: {
      name: 'Computer Science & Engineering',
      code: 'CS',
      academicYearId: academicYear.id,
    },
  });

  const deptECE = await prisma.department.upsert({
    where: { code: 'ECE' },
    update: { name: 'Electronics & Communication Engineering' },
    create: {
      name: 'Electronics & Communication Engineering',
      code: 'ECE',
      academicYearId: academicYear.id,
    },
  });
  console.log('✅ 2 Departments ready: CSE & ECE');

  // ─── 3. Courses ─────────────────────────────────────────────────────
  const courseCSE = await prisma.course.upsert({
    where: { code: 'BTECH-CSE' },
    update: {},
    create: {
      name: 'Bachelor of Technology in Computer Science',
      code: 'BTECH-CSE',
      durationYears: 4,
      departmentId: deptCSE.id,
      academicYearId: academicYear.id,
    },
  });

  const courseECE = await prisma.course.upsert({
    where: { code: 'BTECH-ECE' },
    update: {},
    create: {
      name: 'Bachelor of Technology in Electronics & Communication',
      code: 'BTECH-ECE',
      durationYears: 4,
      departmentId: deptECE.id,
      academicYearId: academicYear.id,
    },
  });
  console.log('✅ 2 Courses ready: BTech CSE & BTech ECE');

  // ─── 4. Sections ────────────────────────────────────────────────────
  const sectionCSE = await prisma.section.upsert({
    where: { id: 1 },
    update: { name: 'CSE 3rd Year A', courseId: courseCSE.id },
    create: {
      name: 'CSE 3rd Year A',
      year: 3,
      courseId: courseCSE.id,
      academicYearId: academicYear.id,
    },
  });

  const sectionECE = await prisma.section.upsert({
    where: { id: 2 },
    update: { name: 'ECE 3rd Year A', courseId: courseECE.id },
    create: {
      name: 'ECE 3rd Year A',
      year: 3,
      courseId: courseECE.id,
      academicYearId: academicYear.id,
    },
  });
  console.log('✅ 2 Sections ready: CSE 3rd Year A & ECE 3rd Year A');

  // ─── 5. Passwords Hashes ───────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin@123', 12);
  const hodHash = await bcrypt.hash('Hod@123', 12);
  const teacherHash = await bcrypt.hash('Teacher@123', 12);
  const studentHash = await bcrypt.hash('Student@123', 12);

  // ─── 6. System Administrator ────────────────────────────────────────
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@attendai.com' },
    update: { role: 'ADMIN', name: 'System Administrator' },
    create: {
      email: 'admin@attendai.com',
      phone: '+919000000001',
      passwordHash: adminHash,
      role: 'ADMIN',
      name: 'System Administrator',
    },
  });
  console.log('✅ System Admin ready:', adminUser.email);

  // ─── 7. Two Branch HODs (Different Branches) ────────────────────────
  // HOD 1: CSE
  const hodCSEUser = await prisma.user.upsert({
    where: { email: 'hod.cs@attendai.com' },
    update: { role: 'HOD', name: 'Dr. Rajesh Gupta (HOD CSE)' },
    create: {
      email: 'hod.cs@attendai.com',
      phone: '+919000000002',
      passwordHash: hodHash,
      role: 'HOD',
      name: 'Dr. Rajesh Gupta (HOD CSE)',
    },
  });

  await prisma.teacher.upsert({
    where: { userId: hodCSEUser.id },
    update: { departmentId: deptCSE.id, employeeCode: 'HOD-CSE-01' },
    create: {
      userId: hodCSEUser.id,
      employeeCode: 'HOD-CSE-01',
      departmentId: deptCSE.id,
    },
  });

  // HOD 2: ECE
  const hodECEUser = await prisma.user.upsert({
    where: { email: 'hod.ece@attendai.com' },
    update: { role: 'HOD', name: 'Dr. Arvind Swaminathan (HOD ECE)' },
    create: {
      email: 'hod.ece@attendai.com',
      phone: '+919000000004',
      passwordHash: hodHash,
      role: 'HOD',
      name: 'Dr. Arvind Swaminathan (HOD ECE)',
    },
  });

  await prisma.teacher.upsert({
    where: { userId: hodECEUser.id },
    update: { departmentId: deptECE.id, employeeCode: 'HOD-ECE-01' },
    create: {
      userId: hodECEUser.id,
      employeeCode: 'HOD-ECE-01',
      departmentId: deptECE.id,
    },
  });
  console.log('✅ 2 Branch HODs ready: hod.cse@attendai.com & hod.ece@attendai.com');

  // ─── 8. Subjects (10 for CSE, 10 for ECE) ───────────────────────────
  const cseSubjectsData = [
    { name: 'Data Structures & Algorithms', code: 'CS301' },
    { name: 'Database Management Systems', code: 'CS302' },
    { name: 'Operating Systems & Linux', code: 'CS303' },
    { name: 'Computer Networks & Security', code: 'CS304' },
    { name: 'Theory of Computation', code: 'CS305' },
    { name: 'Software Engineering & Agile', code: 'CS306' },
    { name: 'Artificial Intelligence & ML', code: 'CS307' },
    { name: 'Cloud Computing & DevOps', code: 'CS308' },
    { name: 'Computer Architecture', code: 'CS309' },
    { name: 'Cyber Security & Forensics', code: 'CS310' },
  ];

  const cseSubjects = [];
  for (const s of cseSubjectsData) {
    const sub = await prisma.subject.upsert({
      where: { code: s.code },
      update: { name: s.name },
      create: s,
    });
    cseSubjects.push(sub);
  }

  const eceSubjectsData = [
    { name: 'Signals and Systems', code: 'EC301' },
    { name: 'Digital Signal Processing', code: 'EC302' },
    { name: 'Microcontrollers & ARM', code: 'EC303' },
    { name: 'Analog & Digital Communication', code: 'EC304' },
    { name: 'VLSI Design & Verilog', code: 'EC305' },
    { name: 'Electromagnetic Field Theory', code: 'EC306' },
    { name: 'Embedded Systems & IoT', code: 'EC307' },
    { name: 'Control Systems Engineering', code: 'EC308' },
    { name: 'Microwave & Radar Engineering', code: 'EC309' },
    { name: 'Optical Fiber Communication', code: 'EC310' },
  ];

  const eceSubjects = [];
  for (const s of eceSubjectsData) {
    const sub = await prisma.subject.upsert({
      where: { code: s.code },
      update: { name: s.name },
      create: s,
    });
    eceSubjects.push(sub);
  }
  console.log('✅ 20 Course Subjects ready (10 CSE, 10 ECE)');

  // ─── 9. 20 Teachers (10 CSE + 10 ECE) ───────────────────────────────
  const cseTeachersData = [
    { email: 'teacher1@attendai.com', name: 'Prof. Ramesh Kumar', empCode: 'T-CSE-001' },
    { email: 'teacher2@attendai.com', name: 'Prof. Priya Sharma', empCode: 'T-CSE-002' },
    { email: 'teacher3@attendai.com', name: 'Prof. Anita Singh', empCode: 'T-CSE-003' },
    { email: 'teacher4@attendai.com', name: 'Prof. Vikram Malhotra', empCode: 'T-CSE-004' },
    { email: 'teacher5@attendai.com', name: 'Prof. Sunita Reddy', empCode: 'T-CSE-005' },
    { email: 'teacher6@attendai.com', name: 'Prof. Amit Joshi', empCode: 'T-CSE-006' },
    { email: 'teacher7@attendai.com', name: 'Prof. Meera Nair', empCode: 'T-CSE-007' },
    { email: 'teacher8@attendai.com', name: 'Prof. Sandeep Verma', empCode: 'T-CSE-008' },
    { email: 'teacher9@attendai.com', name: 'Prof. Pooja Choudhary', empCode: 'T-CSE-009' },
    { email: 'teacher10@attendai.com', name: 'Prof. Rahul Saxena', empCode: 'T-CSE-010' },
  ];

  const cseTeachers = [];
  for (let i = 0; i < cseTeachersData.length; i++) {
    const t = cseTeachersData[i];
    const u = await prisma.user.upsert({
      where: { email: t.email },
      update: { role: 'TEACHER', name: t.name },
      create: {
        email: t.email,
        passwordHash: teacherHash,
        role: 'TEACHER',
        name: t.name,
      },
    });

    const teacher = await prisma.teacher.upsert({
      where: { userId: u.id },
      update: { departmentId: deptCSE.id, employeeCode: t.empCode },
      create: {
        userId: u.id,
        employeeCode: t.empCode,
        departmentId: deptCSE.id,
      },
    });
    cseTeachers.push(teacher);

    // Allocate Teacher to Subject & Section
    await prisma.teacherSubject.upsert({
      where: {
        teacherId_subjectId_sectionId: {
          teacherId: teacher.id,
          subjectId: cseSubjects[i].id,
          sectionId: sectionCSE.id,
        },
      },
      update: {},
      create: {
        teacherId: teacher.id,
        subjectId: cseSubjects[i].id,
        sectionId: sectionCSE.id,
      },
    });
  }

  const eceTeachersData = [
    { email: 'teacher11@attendai.com', name: 'Prof. K. S. Raman', empCode: 'T-ECE-001' },
    { email: 'teacher12@attendai.com', name: 'Prof. Divya Iyer', empCode: 'T-ECE-002' },
    { email: 'teacher13@attendai.com', name: 'Prof. Manoj Deshmukh', empCode: 'T-ECE-003' },
    { email: 'teacher14@attendai.com', name: 'Prof. Shalini Sen', empCode: 'T-ECE-004' },
    { email: 'teacher15@attendai.com', name: 'Prof. Harish Patel', empCode: 'T-ECE-005' },
    { email: 'teacher16@attendai.com', name: 'Prof. Neha Bhatt', empCode: 'T-ECE-006' },
    { email: 'teacher17@attendai.com', name: 'Prof. Deepak Sengupta', empCode: 'T-ECE-007' },
    { email: 'teacher18@attendai.com', name: 'Prof. Ritu Bansal', empCode: 'T-ECE-008' },
    { email: 'teacher19@attendai.com', name: 'Prof. Alok Trivedi', empCode: 'T-ECE-009' },
    { email: 'teacher20@attendai.com', name: 'Prof. Kavita Menon', empCode: 'T-ECE-010' },
  ];

  const eceTeachers = [];
  for (let i = 0; i < eceTeachersData.length; i++) {
    const t = eceTeachersData[i];
    const u = await prisma.user.upsert({
      where: { email: t.email },
      update: { role: 'TEACHER', name: t.name },
      create: {
        email: t.email,
        passwordHash: teacherHash,
        role: 'TEACHER',
        name: t.name,
      },
    });

    const teacher = await prisma.teacher.upsert({
      where: { userId: u.id },
      update: { departmentId: deptECE.id, employeeCode: t.empCode },
      create: {
        userId: u.id,
        employeeCode: t.empCode,
        departmentId: deptECE.id,
      },
    });
    eceTeachers.push(teacher);

    // Allocate Teacher to Subject & Section
    await prisma.teacherSubject.upsert({
      where: {
        teacherId_subjectId_sectionId: {
          teacherId: teacher.id,
          subjectId: eceSubjects[i].id,
          sectionId: sectionECE.id,
        },
      },
      update: {},
      create: {
        teacherId: teacher.id,
        subjectId: eceSubjects[i].id,
        sectionId: sectionECE.id,
      },
    });
  }
  console.log('✅ 20 Teachers created & allocated (10 CSE, 10 ECE)');

  // ─── 10. 50 Students (25 CSE + 25 ECE) ───────────────────────────────
  const cseStudents = [];
  for (let i = 1; i <= 25; i++) {
    const rollNo = `23CSE${String(i).padStart(3, '0')}`;
    const email = `student${i}@attendai.com`;
    const name = `Student ${i} (CSE)`;

    const u = await prisma.user.upsert({
      where: { email },
      update: { role: 'STUDENT', name },
      create: {
        email,
        passwordHash: studentHash,
        role: 'STUDENT',
        name,
      },
    });

    const student = await prisma.student.upsert({
      where: { userId: u.id },
      update: { rollNo, sectionId: sectionCSE.id },
      create: {
        userId: u.id,
        rollNo,
        sectionId: sectionCSE.id,
      },
    });

    // Clearance record
    await prisma.clearanceStatus.upsert({
      where: { studentId: student.id },
      update: { academic: true, accounts: true, library: true, discipline: true, examUnlocked: true },
      create: {
        studentId: student.id,
        semester: 'ODD-2026',
        academic: true,
        accounts: true,
        library: true,
        discipline: true,
        examUnlocked: true,
      },
    });

    cseStudents.push(student);
  }

  const eceStudents = [];
  for (let i = 26; i <= 50; i++) {
    const rollNo = `23ECE${String(i - 25).padStart(3, '0')}`;
    const email = `student${i}@attendai.com`;
    const name = `Student ${i} (ECE)`;

    const u = await prisma.user.upsert({
      where: { email },
      update: { role: 'STUDENT', name },
      create: {
        email,
        passwordHash: studentHash,
        role: 'STUDENT',
        name,
      },
    });

    const student = await prisma.student.upsert({
      where: { userId: u.id },
      update: { rollNo, sectionId: sectionECE.id },
      create: {
        userId: u.id,
        rollNo,
        sectionId: sectionECE.id,
      },
    });

    // Clearance record
    await prisma.clearanceStatus.upsert({
      where: { studentId: student.id },
      update: { academic: true, accounts: true, library: true, discipline: true, examUnlocked: true },
      create: {
        studentId: student.id,
        semester: 'ODD-2026',
        academic: true,
        accounts: true,
        library: true,
        discipline: true,
        examUnlocked: true,
      },
    });

    eceStudents.push(student);
  }
  console.log('✅ 50 Students created (25 in CSE Section A, 25 in ECE Section A)');

  // ─── 11. Timetable Slots (Mon-Fri) ──────────────────────────────────
  const days = [1, 2, 3, 4, 5]; // Mon to Fri
  const periods = [
    { period: 1, start: '09:00', end: '09:55' },
    { period: 2, start: '10:00', end: '10:55' },
    { period: 3, start: '11:00', end: '11:55' },
    { period: 4, start: '12:00', end: '12:55' },
  ];

  // CSE Slots
  for (const day of days) {
    for (let p = 0; p < periods.length; p++) {
      await prisma.timetableSlot.upsert({
        where: {
          sectionId_dayOfWeek_period_academicYearId: {
            sectionId: sectionCSE.id,
            dayOfWeek: day,
            period: periods[p].period,
            academicYearId: academicYear.id,
          },
        },
        update: {},
        create: {
          sectionId: sectionCSE.id,
          subjectId: cseSubjects[p % cseSubjects.length].id,
          teacherId: cseTeachers[p % cseTeachers.length].id,
          dayOfWeek: day,
          period: periods[p].period,
          startTime: periods[p].start,
          endTime: periods[p].end,
          roomNo: `CS-Lab-${p + 1}`,
          academicYearId: academicYear.id,
        },
      });
    }
  }

  // ECE Slots
  for (const day of days) {
    for (let p = 0; p < periods.length; p++) {
      await prisma.timetableSlot.upsert({
        where: {
          sectionId_dayOfWeek_period_academicYearId: {
            sectionId: sectionECE.id,
            dayOfWeek: day,
            period: periods[p].period,
            academicYearId: academicYear.id,
          },
        },
        update: {},
        create: {
          sectionId: sectionECE.id,
          subjectId: eceSubjects[p % eceSubjects.length].id,
          teacherId: eceTeachers[p % eceTeachers.length].id,
          dayOfWeek: day,
          period: periods[p].period,
          startTime: periods[p].start,
          endTime: periods[p].end,
          roomNo: `ECE-Lab-${p + 1}`,
          academicYearId: academicYear.id,
        },
      });
    }
  }
  console.log('✅ Timetables generated for both CSE & ECE sections');

  // ─── 12. Active Published Assignments ──────────────────────────────
  // Assignment 1 for CSE: Data Structures
  const asg1 = await prisma.assignment.upsert({
    where: { id: 'asg-cse-301-trees' },
    update: {},
    create: {
      id: 'asg-cse-301-trees',
      title: 'Assignment 1: AVL & Red-Black Tree Implementation',
      description: 'Implement self-balancing search trees with insertion, deletion, and rotation visualizations in C++/Python. Submit verified Google Drive PDF report.',
      maxMarks: 100,
      dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // in 7 days
      teacherId: cseTeachers[0].id,
      sectionId: sectionCSE.id,
      subjectId: cseSubjects[0].id,
    },
  });

  // Assignment 2 for CSE: DBMS
  const asg2 = await prisma.assignment.upsert({
    where: { id: 'asg-cse-302-sql' },
    update: {},
    create: {
      id: 'asg-cse-302-sql',
      title: 'Assignment 2: Schema Normalization & Complex SQL Queries',
      description: 'Design 3NF relational schemas for a hospital management database with indexing strategies and explain plans.',
      maxMarks: 50,
      dueAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // in 4 days
      teacherId: cseTeachers[1].id,
      sectionId: sectionCSE.id,
      subjectId: cseSubjects[1].id,
    },
  });

  // Assignment 3 for ECE: DSP
  const asg3 = await prisma.assignment.upsert({
    where: { id: 'asg-ece-302-fft' },
    update: {},
    create: {
      id: 'asg-ece-302-fft',
      title: 'Assignment 1: FFT Spectral Analysis & Filter Design',
      description: 'Implement Radix-2 DIT-FFT in Python/MATLAB and plot frequency response for Butterworth low-pass filter.',
      maxMarks: 100,
      dueAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
      teacherId: eceTeachers[1].id,
      sectionId: sectionECE.id,
      subjectId: eceSubjects[1].id,
    },
  });

  // Assignment 4 for ECE: Embedded Systems
  const asg4 = await prisma.assignment.upsert({
    where: { id: 'asg-ece-307-arm' },
    update: {},
    create: {
      id: 'asg-ece-307-arm',
      title: 'Assignment 2: ARM Cortex-M GPIO & Timer Interrupts',
      description: 'Write bare-metal C drivers to configure SysTick and GPIO interrupts on STM32 microcontroller.',
      maxMarks: 50,
      dueAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      teacherId: eceTeachers[6].id,
      sectionId: sectionECE.id,
      subjectId: eceSubjects[6].id,
    },
  });
  console.log('✅ Active Assignments published for CSE & ECE courses');

  // ─── 13. Sample Student Submissions ────────────────────────────────
  // Student 1 (CSE) submitted Assignment 1 -> Graded
  await prisma.assignmentSubmission.upsert({
    where: {
      assignmentId_studentId: {
        assignmentId: asg1.id,
        studentId: cseStudents[0].id,
      },
    },
    update: {},
    create: {
      assignmentId: asg1.id,
      studentId: cseStudents[0].id,
      driveUrl: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view',
      status: AssignmentSubmissionStatus.GRADED,
      marks: 92,
      feedback: 'Excellent AVL rotation logic and clear asymptotic complexity charts.',
      gradedAt: new Date(),
      gradedByUserId: cseTeachers[0].userId,
    },
  });

  // Student 1 (CSE) submitted Assignment 2 -> Pending review
  await prisma.assignmentSubmission.upsert({
    where: {
      assignmentId_studentId: {
        assignmentId: asg2.id,
        studentId: cseStudents[0].id,
      },
    },
    update: {},
    create: {
      assignmentId: asg2.id,
      studentId: cseStudents[0].id,
      driveUrl: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view',
      status: AssignmentSubmissionStatus.SUBMITTED,
    },
  });

  // Student 26 (ECE) submitted Assignment 3 -> Graded
  await prisma.assignmentSubmission.upsert({
    where: {
      assignmentId_studentId: {
        assignmentId: asg3.id,
        studentId: eceStudents[0].id,
      },
    },
    update: {},
    create: {
      assignmentId: asg3.id,
      studentId: eceStudents[0].id,
      driveUrl: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view',
      status: AssignmentSubmissionStatus.GRADED,
      marks: 47,
      feedback: 'Accurate FFT frequency spectrum plot and clear phase analysis.',
      gradedAt: new Date(),
      gradedByUserId: eceTeachers[1].userId,
    },
  });
  console.log('✅ Sample Submissions with marks and teacher reviews recorded');

  // ─── 14. Real Attendance Sessions & History ────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Today's live session for CSE Period 1
  const todaySession = await prisma.attendanceSession.upsert({
    where: {
      sectionId_subjectId_date_period: {
        sectionId: sectionCSE.id,
        subjectId: cseSubjects[0].id,
        date: today,
        period: 1,
      },
    },
    update: {},
    create: {
      sectionId: sectionCSE.id,
      subjectId: cseSubjects[0].id,
      teacherId: cseTeachers[0].id,
      date: today,
      period: 1,
      locked: true,
      lockedAt: new Date(),
    },
  });

  // Mark all CSE students: student 1 is Present, student 2 is Absent (so dispute button works!), etc.
  for (let i = 0; i < cseStudents.length; i++) {
    const isAbsent = i === 1; // Student 2 absent
    await prisma.attendanceRecord.upsert({
      where: {
        sessionId_studentId: {
          sessionId: todaySession.id,
          studentId: cseStudents[i].id,
        },
      },
      update: {},
      create: {
        sessionId: todaySession.id,
        studentId: cseStudents[i].id,
        status: isAbsent ? AttendanceStatus.A : AttendanceStatus.P,
        method: MarkingMethod.QR,
        clientTs: new Date(),
      },
    });
  }

  // Historic sessions over past 10 days
  for (let dayOffset = 1; dayOffset <= 10; dayOffset++) {
    const pastDate = new Date();
    pastDate.setDate(today.getDate() - dayOffset);
    pastDate.setHours(0, 0, 0, 0);

    const subIdx = dayOffset % cseSubjects.length;
    try {
      const pastSession = await prisma.attendanceSession.upsert({
        where: {
          sectionId_subjectId_date_period: {
            sectionId: sectionCSE.id,
            subjectId: cseSubjects[subIdx].id,
            date: pastDate,
            period: 1,
          },
        },
        update: {},
        create: {
          sectionId: sectionCSE.id,
          subjectId: cseSubjects[subIdx].id,
          teacherId: cseTeachers[subIdx].id,
          date: pastDate,
          period: 1,
          locked: true,
          lockedAt: pastDate,
        },
      });

      for (let i = 0; i < 5; i++) {
        // Record for first 5 students
        const st = (dayOffset + i) % 7 === 0 ? AttendanceStatus.A : AttendanceStatus.P;
        await prisma.attendanceRecord.upsert({
          where: {
            sessionId_studentId: {
              sessionId: pastSession.id,
              studentId: cseStudents[i].id,
            },
          },
          update: {},
          create: {
            sessionId: pastSession.id,
            studentId: cseStudents[i].id,
            status: st,
            method: MarkingMethod.QR,
            clientTs: pastDate,
          },
        });
      }
    } catch {
      // ignore potential duplicate
    }
  }
  console.log('✅ Live Attendance Sessions & 30-day History Ledger populated');

  // ─── 15. Library Books Issued ──────────────────────────────────────
  await prisma.libraryRecord.createMany({
    data: [
      {
        studentId: cseStudents[0].id,
        bookTitle: 'Introduction to Algorithms (CLRS)',
        bookCode: 'CS-LIB-4401',
        issuedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        finePaid: false,
      },
      {
        studentId: eceStudents[0].id,
        bookTitle: 'Digital Signal Processing: Principles, Algorithms',
        bookCode: 'ECE-LIB-2104',
        issuedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
        finePaid: false,
      },
    ],
    skipDuplicates: true,
  });

  // ─── 16. Notices ───────────────────────────────────────────────────
  await prisma.notice.createMany({
    data: [
      {
        title: 'Mid-Semester Examination Schedule Published',
        body: 'Mid-term sessionals for all 3rd Year B.Tech students will commence from next Monday. Detailed timetable available on department notice board.',
        category: NoticeCategory.EXAM,
        postedBy: adminUser.id,
        isActive: true,
      },
      {
        title: 'Technical Fest 2026: Campus Registrations Open',
        body: 'Annual inter-college hackathon and robotics competition registrations are open. Claim OD approval from respective HODs.',
        category: NoticeCategory.EVENT,
        postedBy: adminUser.id,
        isActive: true,
      },
    ],
    skipDuplicates: true,
  });
  console.log('✅ Library Records and Campus Notices added');

  console.log('\n🎉 ALL INSTITUTIONAL DATA SUCCESSFULLY INGESTED!');
}

main()
  .catch((e) => {
    console.error('❌ Ingestion Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
