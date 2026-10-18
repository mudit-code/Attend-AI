import { Router, Response, NextFunction } from "express";
import { authenticate, AuthRequest } from "../../middlewares/auth";
import { requireRole } from "../../middlewares/role";
import * as marksService from "./service";
import { prisma } from "../../lib/prisma";
import type { MarkType } from "@prisma/client";

const router = Router();
router.use(authenticate);

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
    const data = await marksService.getSectionMarks(Number(req.params.sectionId), subjectId);
    res.json({ data });
  } catch (err) { next(err); }
});

// Teacher: enter/update mark
router.post("/", requireRole("TEACHER", "HOD", "ADMIN"), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { studentId, subjectId, markType, marks, maxMarks } = req.body;
    const data = await marksService.upsertMark({ studentId, subjectId, markType: markType as MarkType, marks, maxMarks, enteredBy: req.user!.id });
    res.status(201).json({ data });
  } catch (err) { next(err); }
});

// Teacher: bulk enter/update marks for section
router.post("/bulk", requireRole("TEACHER", "HOD", "ADMIN"), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { subjectId, markType, maxMarks, marks } = req.body;
    if (!Array.isArray(marks) || marks.length === 0) {
      res.status(400).json({ error: { message: "marks array is required" } });
      return;
    }
    const results = await prisma.$transaction(async (tx) => {
      const saved = [];
      for (const m of marks) {
        const studentId = Number(m.studentId);
        const markVal = Number(m.marks);
        if (isNaN(studentId) || isNaN(markVal)) continue;

        const record = await tx.internalMark.upsert({
          where: {
            studentId_subjectId_markType: {
              studentId,
              subjectId: Number(subjectId),
              markType: markType as MarkType,
            },
          },
          update: {
            marks: markVal,
            maxMarks: maxMarks ? Number(maxMarks) : 25,
            enteredBy: req.user!.id,
          },
          create: {
            studentId,
            subjectId: Number(subjectId),
            markType: markType as MarkType,
            marks: markVal,
            maxMarks: maxMarks ? Number(maxMarks) : 25,
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
