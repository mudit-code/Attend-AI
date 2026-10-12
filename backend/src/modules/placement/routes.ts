import { Router, Response, NextFunction } from "express";
import { authenticate, AuthRequest } from "../../middlewares/auth";
import { requireRole } from "../../middlewares/role";
import * as placementService from "./service";

const router = Router();
router.use(authenticate);

router.get("/drives", async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await placementService.getDrives();
    res.json({ data });
  } catch (err) { next(err); }
});

router.get("/drives/:id/eligibility", requireRole("STUDENT"), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await placementService.checkEligibility(Number(req.params.id), req.user!.id);
    res.json({ data });
  } catch (err) { next(err); }
});

router.post("/drives/:id/register", requireRole("STUDENT"), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await placementService.registerForDrive(Number(req.params.id), req.user!.id);
    res.status(201).json({ data });
  } catch (err) { next(err); }
});

router.post("/drives", requireRole("ADMIN", "HOD"), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await placementService.createDrive(req.body);
    res.status(201).json({ data });
  } catch (err) { next(err); }
});

export default router;
