import { Router, Response, NextFunction } from "express";
import { authenticate, AuthRequest } from "../../middlewares/auth";
import { requireRole } from "../../middlewares/role";
import * as grievanceService from "./service";

const router = Router();
router.use(authenticate);

router.post("/", requireRole("STUDENT"), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await grievanceService.createTicket(req.user!.id, req.body);
    res.status(201).json({ data });
  } catch (err) { next(err); }
});

router.get("/my", requireRole("STUDENT"), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await grievanceService.getMyTickets(req.user!.id);
    res.json({ data });
  } catch (err) { next(err); }
});

router.get("/all", requireRole("ADMIN", "HOD", "TEACHER"), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await grievanceService.getAllTickets(req.query.status as string);
    res.json({ data });
  } catch (err) { next(err); }
});

router.patch("/:id/resolve", requireRole("ADMIN", "HOD"), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ticketId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data = await grievanceService.resolveTicket(ticketId, req.user!.id, req.body.resolution);
    res.json({ data });
  } catch (err) { next(err); }
});

export default router;
