import { prisma } from "../../lib/prisma";

export async function getRecoveryStats(studentId: number) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { user: { select: { name: true } } },
  });
  if (!student) throw { code: "NOT_FOUND", status: 404, message: "Student not found" };

  const rules = await prisma.attendanceRule.findFirst();
  const target = rules?.minPercent ?? 75;
  const countLeave = rules?.countLeaveAsPresent ?? false;

  const records = await prisma.attendanceRecord.findMany({
    where: { studentId },
    include: { session: { include: { subject: true } } },
  });

  const subjectMap = new Map<number, { subjectId: number; subjectName: string; subjectCode: string; total: number; effective: number }>();

  for (const r of records) {
    const sId = r.session.subjectId;
    if (!subjectMap.has(sId)) {
      subjectMap.set(sId, { subjectId: sId, subjectName: r.session.subject.name, subjectCode: r.session.subject.code, total: 0, effective: 0 });
    }
    const sub = subjectMap.get(sId)!;
    sub.total++;
    if (r.status === "P" || r.status === "OD" || (countLeave && r.status === "LV")) sub.effective++;
  }

  const td = target / 100;
  const subjectWise = Array.from(subjectMap.values()).map((sub) => {
    const percentage = sub.total > 0 ? Number(((sub.effective / sub.total) * 100).toFixed(1)) : 100;
    const safeBunksAllowed = percentage >= target ? Math.max(0, Math.floor(sub.effective / td - sub.total)) : 0;
    const lecturesNeededToRecover = percentage < target ? Math.ceil((td * sub.total - sub.effective) / (1 - td)) : 0;
    const status: "SAFE" | "WARNING" | "DANGER" = percentage >= target ? (safeBunksAllowed > 5 ? "SAFE" : "WARNING") : "DANGER";
    return { subjectId: sub.subjectId, subjectName: sub.subjectName, subjectCode: sub.subjectCode, attended: sub.effective, total: sub.total, percentage, target, status, lecturesNeededToRecover, safeBunksAllowed };
  });

  const totalEffective = subjectWise.reduce((s, x) => s + x.attended, 0);
  const totalClasses = subjectWise.reduce((s, x) => s + x.total, 0);
  const overallPct = totalClasses > 0 ? Number(((totalEffective / totalClasses) * 100).toFixed(1)) : 100;
  const overallSafe = overallPct >= target ? Math.max(0, Math.floor(totalEffective / td - totalClasses)) : 0;
  const overallNeeded = overallPct < target ? Math.ceil((td * totalClasses - totalEffective) / (1 - td)) : 0;

  return {
    studentName: student.user.name,
    target,
    subjectWise,
    overall: { attended: totalEffective, total: totalClasses, percentage: overallPct, safeBunksAllowed: overallSafe, lecturesNeededToRecover: overallNeeded, status: overallPct >= target ? (overallSafe > 5 ? "SAFE" : "WARNING") : "DANGER" },
  };
}
