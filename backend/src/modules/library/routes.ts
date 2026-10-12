import { Router, Response, NextFunction } from "express";
import { authenticate, AuthRequest } from "../../middlewares/auth";
import { requireRole } from "../../middlewares/role";
import * as libraryService from "./service";

const router = Router();
router.use(authenticate);

router.get("/my", requireRole("STUDENT"), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await libraryService.getStudentBooks(req.user!.id);
    res.json({ data });
  } catch (err) { next(err); }
});

router.post("/issue", requireRole("ADMIN", "HOD"), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await libraryService.issueBook(req.body);
    res.status(201).json({ data });
  } catch (err) { next(err); }
});

router.patch("/:id/return", requireRole("ADMIN", "HOD"), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await libraryService.returnBook(Number(req.params.id));
    res.json({ data });
  } catch (err) { next(err); }
});

export default router;
