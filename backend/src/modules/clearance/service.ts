import { prisma } from "../../lib/prisma";

export async function getStudentClearance(userId: number) {
  const student = await prisma.student.findUnique({ where: { userId } });
  if (!student) throw { code: "NOT_FOUND", status: 404, message: "Student not found" };
  return prisma.clearanceStatus.findUnique({ where: { studentId: student.id } });
}

export async function upsertClearance(studentId: number, data: Partial<{ academic: boolean; accounts: boolean; library: boolean; discipline: boolean; examUnlocked: boolean; semester: string }>) {
  const existing = await prisma.clearanceStatus.findUnique({ where: { studentId } });
  if (existing) {
    const updated = await prisma.clearanceStatus.update({
      where: { studentId },
      data,
    });
    // Auto-unlock exam if all 4 cleared
    if (updated.academic && updated.accounts && updated.library && updated.discipline && !updated.examUnlocked) {
      return prisma.clearanceStatus.update({ where: { studentId }, data: { examUnlocked: true } });
    }
    return updated;
  }
  return prisma.clearanceStatus.create({
    data: { studentId, semester: data.semester ?? "ODD-2026", ...data },
  });
}

export async function getAllClearances() {
  return prisma.clearanceStatus.findMany({
    include: { student: { include: { user: { select: { name: true, email: true } }, section: true } } },
    orderBy: { student: { rollNo: "asc" } },
  });
}
