import { prisma } from "../../lib/prisma";
import type { MarkType } from "@prisma/client";

export async function getStudentMarks(userId: number) {
  const student = await prisma.student.findUnique({ where: { userId } });
  if (!student) throw { code: "NOT_FOUND", status: 404, message: "Student not found" };

  const marks = await prisma.internalMark.findMany({
    where: { studentId: student.id },
    orderBy: [{ subjectId: "asc" }, { markType: "asc" }],
  });

  const subjects = await prisma.subject.findMany({
    where: { id: { in: [...new Set(marks.map((m) => m.subjectId))] } },
  });

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  const grouped = new Map<number, { subjectId: number; subjectName: string; subjectCode: string; marks: typeof marks }>();

  for (const mark of marks) {
    if (!grouped.has(mark.subjectId)) {
      const sub = subjectMap.get(mark.subjectId);
      grouped.set(mark.subjectId, {
        subjectId: mark.subjectId,
        subjectName: sub?.name ?? "Unknown",
        subjectCode: sub?.code ?? "-",
        marks: [],
      });
    }
    grouped.get(mark.subjectId)!.marks.push(mark);
  }

  return Array.from(grouped.values());
}

export async function getSectionMarks(sectionId: number, subjectId?: number) {
  const students = await prisma.student.findMany({
    where: { sectionId },
    include: { user: { select: { name: true } } },
    orderBy: { rollNo: "asc" },
  });

  const results = await Promise.all(
    students.map(async (st) => {
      const marks = await prisma.internalMark.findMany({
        where: { studentId: st.id, ...(subjectId ? { subjectId } : {}) },
      });
      return { studentId: st.id, rollNo: st.rollNo, name: st.user.name, marks };
    })
  );

  return results;
}

export async function upsertMark(data: { studentId: number; subjectId: number; markType: MarkType; marks: number; maxMarks: number; enteredBy: number }) {
  return prisma.internalMark.upsert({
    where: { studentId_subjectId_markType: { studentId: data.studentId, subjectId: data.subjectId, markType: data.markType } },
    update: { marks: data.marks, maxMarks: data.maxMarks, enteredBy: data.enteredBy, status: "DRAFT" },
    create: { ...data, status: "DRAFT" },
  });
}

export async function approveMark(id: number) {
  return prisma.internalMark.update({ where: { id }, data: { status: "APPROVED" } });
}
