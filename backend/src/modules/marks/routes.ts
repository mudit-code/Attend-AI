import { Router, Response, NextFunction } from "express";
import { authenticate, AuthRequest } from "../../middlewares/auth";
import { requireRole } from "../../middlewares/role";
import * as marksService from "./service";
import { prisma } from "../../lib/prisma";
import { MarkType, type MarkType as MarkTypeValue } from "@prisma/client";

const router = Router();
router.use(authenticate);
const markTypes = new Set<string>(Object.values(MarkType));

async function teacherHasAllocation(userId: number, sectionId: number, subjectId?: number) {
  const teacher = await prisma.teacher.findUnique({ where: { userId }, select: { id: true } });
  if (!teacher) return false;
  return Boolean(await prisma.teacherSubject.findFirst({
    where: { teacherId: teacher.id, sectionId, ...(subjectId ? { subjectId } : {}) },
    select: { id: true },
  }));
}

// Student: get my marks
router.get("/my", requireRole("STUDENT"), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await marksService.getStudentMarks(req.user!.id);
    res.json({ data });
  } catch (err) { next(err); }
});

// Teacher/HOD: get section marks
router.get("/section/:sectionId", requireRole("TEACHER", "HOD", "ADMIN"), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const subjectId = req.query.subjectId ? Number(req.query.subjectId) : undefined;
    const sectionId = Number(req.params.sectionId);
    if (!Number.isInteger(sectionId) || (subjectId !== undefined && !Number.isInteger(subjectId))) {
      res.status(400).json({ error: { code: "INVALID_SELECTION", message: "Invalid section or subject." } });
      return;
    }
    if (req.user!.role === "TEACHER" && !await teacherHasAllocation(req.user!.id, sectionId, subjectId)) {
      res.status(403).json({ error: { code: "NOT_ASSIGNED", message: "You are not assigned to this class and subject." } });
      return;
    }
    const data = await marksService.getSectionMarks(sectionId, subjectId);
    res.json({ data });
  } catch (err) { next(err); }
});

// Teacher: enter/update mark
router.post("/", requireRole("TEACHER", "HOD", "ADMIN"), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const studentId = Number(req.body.studentId);
    const subjectId = Number(req.body.subjectId);
    const marks = Number(req.body.marks);
    const maxMarks = Number(req.body.maxMarks);
    const markType = String(req.body.markType);
    if (!Number.isInteger(studentId) || !Number.isInteger(subjectId) || !markTypes.has(markType) ||
      !Number.isFinite(maxMarks) || maxMarks <= 0 || !Number.isFinite(marks) || marks < 0 || marks > maxMarks) {
      res.status(400).json({ error: { code: "INVALID_MARK", message: "Provide valid mark, maximum, student, subject, and mark type values." } });
      return;
    }
    const student = await prisma.student.findUnique({ where: { id: studentId }, select: { sectionId: true } });
    if (!student) {
      res.status(404).json({ error: { code: "STUDENT_NOT_FOUND", message: "Student not found." } });
      return;
    }
    if (req.user!.role === "TEACHER" && !await teacherHasAllocation(req.user!.id, student.sectionId, subjectId)) {
      res.status(403).json({ error: { code: "NOT_ASSIGNED", message: "You are not assigned to this student's class and subject." } });
      return;
    }
    const data = await marksService.upsertMark({ studentId, subjectId, markType: markType as MarkTypeValue, marks, maxMarks, enteredBy: req.user!.id });
    res.status(201).json({ data });
  } catch (err) { next(err); }
});

// Teacher: bulk enter/update marks for section
router.post("/bulk", requireRole("TEACHER", "HOD", "ADMIN"), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const sectionId = Number(req.body.sectionId);
    const subjectId = Number(req.body.subjectId);
    const markType = String(req.body.markType);
    const maxMarks = Number(req.body.maxMarks);
    const marks = req.body.marks;
    if (!Number.isInteger(sectionId) || !Number.isInteger(subjectId) || !markTypes.has(markType) ||
      !Number.isFinite(maxMarks) || maxMarks <= 0 || !Array.isArray(marks) || marks.length === 0 ||
      marks.some((item: any) => !Number.isInteger(Number(item.studentId)) ||
        !Number.isFinite(Number(item.marks)) || Number(item.marks) < 0 || Number(item.marks) > maxMarks)) {
      res.status(400).json({ error: { code: "INVALID_MARKS", message: "Provide a valid class, subject, mark type, maximum, and marks list." } });
      return;
    }
    if (req.user!.role === "TEACHER" && !await teacherHasAllocation(req.user!.id, sectionId, subjectId)) {
      res.status(403).json({ error: { code: "NOT_ASSIGNED", message: "You are not assigned to this class and subject." } });
      return;
    }
    const studentIds = marks.map((item: any) => Number(item.studentId));
    const enrolledStudents = await prisma.student.findMany({
      where: { id: { in: studentIds }, sectionId },
      select: { id: true },
    });
    if (enrolledStudents.length !== new Set(studentIds).size) {
      res.status(403).json({ error: { code: "WRONG_SECTION", message: "Marks can only be entered for students enrolled in the selected class." } });
      return;
    }
    const results = await prisma.$transaction(async (tx) => {
      const saved = [];
      for (const m of marks) {
        const studentId = Number(m.studentId);
        const markVal = Number(m.marks);

        const record = await tx.internalMark.upsert({
          where: {
            studentId_subjectId_markType: {
              studentId,
              subjectId: Number(subjectId),
              markType: markType as MarkTypeValue,
            },
          },
          update: {
            marks: markVal,
            maxMarks,
            enteredBy: req.user!.id,
          },
          create: {
            studentId,
            subjectId: Number(subjectId),
            markType: markType as MarkTypeValue,
            marks: markVal,
            maxMarks,
            enteredBy: req.user!.id,
            status: 'DRAFT',
          },
        });
        saved.push(record);
      }
      return saved;
    });

    res.status(201).json({ success: true, count: results.length, data: results });
  } catch (err) { next(err); }
});

// HOD/Admin: approve mark
router.patch("/:id/approve", requireRole("HOD", "ADMIN"), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await marksService.approveMark(Number(req.params.id));
    res.json({ data });
  } catch (err) { next(err); }
});

export default router;
