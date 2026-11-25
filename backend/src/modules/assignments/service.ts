import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { verifyPublicGoogleDrivePdf } from './drivePdf';
import { AssignmentWorkflowError } from './errors';
import type { CreateAssignmentInput, GradeSubmissionInput } from './schema';

const teacherAssignmentInclude = {
  section: { select: { id: true, name: true } },
  subject: { select: { id: true, name: true, code: true } },
  submissions: {
    include: {
      student: {
        select: {
          id: true,
          rollNo: true,
          user: { select: { name: true } },
        },
      },
    },
    orderBy: { submittedAt: 'desc' as const },
  },
};

async function getTeacher(userId: number) {
  const teacher = await prisma.teacher.findUnique({ where: { userId } });
  if (!teacher) {
    throw new AssignmentWorkflowError(403, 'TEACHER_PROFILE_REQUIRED', 'A teacher profile is required for this action.');
  }
  return teacher;
}

async function getOwnedSubmission(userId: number, submissionId: string) {
  const teacher = await getTeacher(userId);
  const submission = await prisma.assignmentSubmission.findUnique({
    where: { id: submissionId },
    include: { assignment: { select: { id: true, teacherId: true, maxMarks: true } } },
  });

  if (!submission || submission.assignment.teacherId !== teacher.id) {
    throw new AssignmentWorkflowError(404, 'SUBMISSION_NOT_FOUND', 'Assignment submission not found.');
  }

  return submission;
}

export async function listStudentAssignments(userId: number) {
  const student = await prisma.student.findUnique({ where: { userId } });
  if (!student) {
    throw new AssignmentWorkflowError(403, 'STUDENT_PROFILE_REQUIRED', 'A student profile is required for this action.');
  }

  return prisma.assignment.findMany({
    where: { sectionId: student.sectionId },
    include: {
      subject: { select: { id: true, name: true, code: true } },
      teacher: { select: { user: { select: { name: true } } } },
      submissions: {
        where: { studentId: student.id },
        select: {
          id: true,
          driveUrl: true,
          status: true,
          marks: true,
          feedback: true,
          submittedAt: true,
          gradedAt: true,
          signedOffAt: true,
        },
      },
    },
    orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
  });
}

export async function listTeacherAssignments(userId: number) {
  const teacher = await getTeacher(userId);
  return prisma.assignment.findMany({
    where: { teacherId: teacher.id },
    include: teacherAssignmentInclude,
    orderBy: { createdAt: 'desc' },
  });
}

export async function createAssignment(userId: number, input: CreateAssignmentInput) {
  const teacher = await getTeacher(userId);
  const teachingAssignment = await prisma.teacherSubject.findFirst({
    where: {
      teacherId: teacher.id,
      sectionId: input.sectionId,
      subjectId: input.subjectId,
    },
  });

  if (!teachingAssignment) {
    throw new AssignmentWorkflowError(
      403,
      'CLASS_NOT_ASSIGNED',
      'You can create assignments only for your assigned subjects and sections.'
    );
  }

  return prisma.assignment.create({
    data: {
      title: input.title,
      description: input.description,
      sectionId: input.sectionId,
      subjectId: input.subjectId,
      maxMarks: input.maxMarks,
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
      teacherId: teacher.id,
    },
    include: teacherAssignmentInclude,
  });
}

export async function submitAssignment(userId: number, assignmentId: string, driveUrl: string) {
  const student = await prisma.student.findUnique({ where: { userId } });
  if (!student) {
    throw new AssignmentWorkflowError(403, 'STUDENT_PROFILE_REQUIRED', 'A student profile is required for this action.');
  }

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: { id: true, sectionId: true },
  });
  if (!assignment) {
    throw new AssignmentWorkflowError(404, 'ASSIGNMENT_NOT_FOUND', 'Assignment not found.');
  }
  if (assignment.sectionId !== student.sectionId) {
    throw new AssignmentWorkflowError(403, 'WRONG_SECTION', 'This assignment is not assigned to your section.');
  }

  await verifyPublicGoogleDrivePdf(driveUrl);

  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.assignmentSubmission.findUnique({
        where: { assignmentId_studentId: { assignmentId, studentId: student.id } },
        select: { id: true, status: true },
      });

      if (existing?.status === 'SIGNED_OFF') {
        throw new AssignmentWorkflowError(409, 'SUBMISSION_SIGNED_OFF', 'This submission has been signed off and can no longer be changed.');
      }

      if (existing) {
        const updated = await tx.assignmentSubmission.updateMany({
          where: { id: existing.id, status: { not: 'SIGNED_OFF' } },
          data: {
            driveUrl,
            status: 'SUBMITTED',
            marks: null,
            feedback: null,
            submittedAt: new Date(),
            gradedAt: null,
            gradedByUserId: null,
            signedOffAt: null,
            signedOffByUserId: null,
          },
        });
        if (updated.count !== 1) {
          throw new AssignmentWorkflowError(409, 'SUBMISSION_SIGNED_OFF', 'This submission has been signed off and can no longer be changed.');
        }
        return tx.assignmentSubmission.findUniqueOrThrow({ where: { id: existing.id } });
      }

      return tx.assignmentSubmission.create({
        data: { assignmentId, studentId: student.id, driveUrl },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AssignmentWorkflowError(409, 'SUBMISSION_CONFLICT', 'A submission already exists. Refresh and try again.');
    }
    throw error;
  }
}

export async function gradeSubmission(userId: number, submissionId: string, input: GradeSubmissionInput) {
  const submission = await getOwnedSubmission(userId, submissionId);
  if (input.marks > submission.assignment.maxMarks) {
    throw new AssignmentWorkflowError(400, 'MARKS_OUT_OF_RANGE', `Marks cannot exceed ${submission.assignment.maxMarks}.`);
  }
  if (submission.status === 'SIGNED_OFF') {
    throw new AssignmentWorkflowError(409, 'SUBMISSION_SIGNED_OFF', 'A signed-off submission cannot be changed.');
  }

  const updated = await prisma.assignmentSubmission.updateMany({
    where: { id: submissionId, status: { in: ['SUBMITTED', 'GRADED'] } },
    data: {
      marks: input.marks,
      feedback: input.feedback ?? null,
      status: 'GRADED',
      gradedAt: new Date(),
      gradedByUserId: userId,
    },
  });
  if (updated.count !== 1) {
    throw new AssignmentWorkflowError(409, 'SUBMISSION_SIGNED_OFF', 'A signed-off submission cannot be changed.');
  }

  return prisma.assignmentSubmission.findUniqueOrThrow({ where: { id: submissionId } });
}

export async function signOffSubmission(userId: number, submissionId: string) {
  await getOwnedSubmission(userId, submissionId);
  const updated = await prisma.assignmentSubmission.updateMany({
    where: { id: submissionId, status: 'GRADED' },
    data: { status: 'SIGNED_OFF', signedOffAt: new Date(), signedOffByUserId: userId },
  });

  if (updated.count !== 1) {
    throw new AssignmentWorkflowError(409, 'GRADE_REQUIRED', 'Grade the submission before signing it off.');
  }

  return prisma.assignmentSubmission.findUniqueOrThrow({ where: { id: submissionId } });
}
