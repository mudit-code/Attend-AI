-- AlterTable
ALTER TABLE "attendance_sessions" ADD COLUMN     "faceWindowActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "faceWindowExpiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "sections" ADD COLUMN     "isFaceAttendanceEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "faceDescriptor" DOUBLE PRECISION[] DEFAULT ARRAY[]::DOUBLE PRECISION[],
ADD COLUMN     "faceRegisteredAt" TIMESTAMP(3);
