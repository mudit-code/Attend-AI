import { prisma } from "../../lib/prisma";
import type { NoticeCategory } from "@prisma/client";

export async function getNotices(role?: string) {
  return prisma.notice.findMany({
    where: { isActive: true, OR: [{ targetRole: null }, { targetRole: role ?? null }] },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function createNotice(data: { title: string; body: string; category: NoticeCategory; targetRole?: string; pdfUrl?: string; postedBy: number; expiresAt?: string }) {
  return prisma.notice.create({
    data: {
      title: data.title,
      body: data.body,
      category: data.category,
      targetRole: data.targetRole,
      pdfUrl: data.pdfUrl,
      postedBy: data.postedBy,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    },
  });
}

export async function deactivateNotice(id: number) {
  return prisma.notice.update({ where: { id }, data: { isActive: false } });
}
