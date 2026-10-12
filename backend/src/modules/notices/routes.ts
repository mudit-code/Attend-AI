import { Router, Response, NextFunction } from "express";
import { authenticate, AuthRequest } from "../../middlewares/auth";
import { requireRole } from "../../middlewares/role";
import * as noticesService from "./service";

const router = Router();
router.use(authenticate);

router.get("/", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await noticesService.getNotices(req.user!.role);
    res.json({ data });
  } catch (err) { next(err); }
});

router.post("/", requireRole("ADMIN", "HOD"), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await noticesService.createNotice({ ...req.body, postedBy: req.user!.id });
    res.status(201).json({ data });
  } catch (err) { next(err); }
});

router.delete("/:id", requireRole("ADMIN", "HOD"), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await noticesService.deactivateNotice(Number(req.params.id));
    res.json({ message: "Notice deactivated" });
  } catch (err) { next(err); }
});

export default router;
