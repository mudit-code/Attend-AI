import { prisma } from "../../lib/prisma";

export async function getStudentBooks(userId: number) {
  const student = await prisma.student.findUnique({ where: { userId } });
  if (!student) throw { code: "NOT_FOUND", status: 404, message: "Student not found" };

  const records = await prisma.libraryRecord.findMany({
    where: { studentId: student.id },
    orderBy: { dueDate: "asc" },
  });

  const now = new Date();
  const booksWithFine = records.map((r) => {
    const isOverdue = !r.returnedAt && r.dueDate < now;
    const daysOverdue = isOverdue ? Math.floor((now.getTime() - r.dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const fine = isOverdue && !r.finePaid ? daysOverdue * r.finePerDay : 0;
    return { ...r, isOverdue, daysOverdue, fine };
  });

  const totalFine = booksWithFine.reduce((s, b) => s + b.fine, 0);
  const activeBooks = booksWithFine.filter((b) => !b.returnedAt);

  return { books: booksWithFine, activeBooks: activeBooks.length, totalFine };
}

export async function issueBook(data: { studentId: number; bookTitle: string; bookCode: string; dueDate: string }) {
  return prisma.libraryRecord.create({
    data: { ...data, issuedAt: new Date(), dueDate: new Date(data.dueDate) },
  });
}

export async function returnBook(id: number) {
  const record = await prisma.libraryRecord.update({
    where: { id },
    data: { returnedAt: new Date() },
  });
  // Update clearance: if no active books, set library = true
  const student = await prisma.student.findUnique({ where: { id: record.studentId } });
  if (student) {
    const activeBooks = await prisma.libraryRecord.count({ where: { studentId: student.id, returnedAt: null } });
    if (activeBooks === 0) {
      await prisma.clearanceStatus.upsert({
        where: { studentId: student.id },
        update: { library: true },
        create: { studentId: student.id, semester: "ODD-2026", library: true },
      });
    }
  }
  return record;
}
