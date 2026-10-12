import { prisma } from "../../lib/prisma";
import type { GrievanceCategory, TicketStatus } from "@prisma/client";

export async function createTicket(userId: number, data: { title: string; description: string; category: GrievanceCategory; isAnonymous: boolean }) {
  const student = await prisma.student.findUnique({ where: { userId } });
  if (!student) throw { code: "NOT_FOUND", status: 403, message: "Only students can file grievances" };
  return prisma.grievanceTicket.create({ data: { studentId: student.id, ...data, status: "OPEN" } });
}

export async function getMyTickets(userId: number) {
  const student = await prisma.student.findUnique({ where: { userId } });
  if (!student) return [];
  return prisma.grievanceTicket.findMany({
    where: { studentId: student.id },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAllTickets(status?: string) {
  const tickets = await prisma.grievanceTicket.findMany({
    where: status ? { status: status as TicketStatus } : undefined,
    include: { student: { include: { user: { select: { name: true } }, section: true } } },
    orderBy: { createdAt: "desc" },
  });
  // Mask anonymous ones
  return tickets.map((t) => ({
    ...t,
    student: t.isAnonymous ? { user: { name: "Anonymous" }, section: t.student.section } : t.student,
  }));
}

export async function resolveTicket(id: string, userId: number, resolution: string) {
  return prisma.grievanceTicket.update({
    where: { id },
    data: { status: "RESOLVED", resolution, resolvedAt: new Date(), assignedTo: userId },
  });
}
