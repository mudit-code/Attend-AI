import { Router, Response, NextFunction } from "express";
import { authenticate, AuthRequest } from "../../middlewares/auth";
import { requireRole } from "../../middlewares/role";
import * as clearanceService from "./service";
import { prisma } from "../../lib/prisma";

const router = Router();
router.use(authenticate);

router.get("/my", requireRole("STUDENT"), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await clearanceService.getStudentClearance(req.user!.id);
    res.json({ data });
  } catch (err) { next(err); }
});

router.get("/all", requireRole("ADMIN", "HOD"), async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await clearanceService.getAllClearances();
    res.json({ data });
  } catch (err) { next(err); }
});

router.patch("/:studentId", requireRole("ADMIN", "HOD"), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await clearanceService.upsertClearance(Number(req.params.studentId), req.body);
    res.json({ data });
  } catch (err) { next(err); }
});

export default router;
