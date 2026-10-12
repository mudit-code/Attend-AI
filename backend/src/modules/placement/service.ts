import { prisma } from "../../lib/prisma";

export async function getDrives() {
  return prisma.placementDrive.findMany({
    where: { driveDate: { gte: new Date() } },
    include: { _count: { select: { registrations: true } } },
    orderBy: { driveDate: "asc" },
  });
}

export async function checkEligibility(driveId: number, userId: number) {
  const drive = await prisma.placementDrive.findUnique({ where: { id: driveId } });
  if (!drive) throw { code: "NOT_FOUND", status: 404, message: "Drive not found" };

  const student = await prisma.student.findUnique({
    where: { userId },
    include: { section: { include: { course: { include: { department: true } } } } },
  });
  if (!student) throw { code: "NOT_FOUND", status: 404, message: "Student not found" };

  const records = await prisma.attendanceRecord.findMany({ where: { studentId: student.id } });
  const total = records.length;
  const effective = records.filter((r) => r.status === "P" || r.status === "OD").length;
  const attendance = total > 0 ? (effective / total) * 100 : 100;

  const branch = student.section.course.department.code;
  const branchEligible = drive.eligibleBranches.length === 0 || drive.eligibleBranches.includes(branch);
  const attendanceEligible = attendance >= drive.minAttendance;

  return {
    driveId,
    companyName: drive.companyName,
    driveDate: drive.driveDate,
    isEligible: branchEligible && attendanceEligible,
    reasons: [
      !attendanceEligible && `Attendance ${attendance.toFixed(1)}% < required ${drive.minAttendance}%`,
      !branchEligible && `Branch ${branch} not eligible`,
    ].filter(Boolean),
    currentAttendance: Number(attendance.toFixed(1)),
    requiredAttendance: drive.minAttendance,
  };
}

export async function registerForDrive(driveId: number, userId: number) {
  const eligibility = await checkEligibility(driveId, userId);
  const student = await prisma.student.findUnique({ where: { userId } });
  if (!student) throw { code: "NOT_FOUND", status: 404, message: "Student not found" };

  return prisma.driveRegistration.upsert({
    where: { driveId_studentId: { driveId, studentId: student.id } },
    update: { isEligible: eligibility.isEligible },
    create: { driveId, studentId: student.id, isEligible: eligibility.isEligible },
  });
}

export async function createDrive(data: { companyName: string; driveDate: string; minAttendance?: number; minCgpa?: number; eligibleBranches?: string[]; description?: string; registrationDeadline?: string }) {
  return prisma.placementDrive.create({
    data: {
      companyName: data.companyName,
      driveDate: new Date(data.driveDate),
      minAttendance: data.minAttendance ?? 75,
      minCgpa: data.minCgpa,
      eligibleBranches: data.eligibleBranches ?? [],
      description: data.description,
      registrationDeadline: data.registrationDeadline ? new Date(data.registrationDeadline) : undefined,
    },
  });
}
