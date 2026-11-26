-- CreateEnum
CREATE TYPE "GatePassStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "GatePassReason" AS ENUM ('MEDICAL_EMERGENCY', 'DOCTOR_APPOINTMENT', 'FAMILY_EMERGENCY', 'BANK_WORK', 'COURT_LEGAL', 'TRAVEL', 'PERSONAL', 'OTHER');

-- CreateTable
CREATE TABLE "gate_passes" (
    "id" TEXT NOT NULL,
    "studentId" INTEGER NOT NULL,
    "reason" "GatePassReason" NOT NULL,
    "reasonOther" TEXT,
    "destination" TEXT NOT NULL,
    "additionalNote" TEXT,
    "documentUrl" TEXT,
    "outTime" TIMESTAMP(3) NOT NULL,
    "expectedInTime" TIMESTAMP(3) NOT NULL,
    "mentorTeacherId" INTEGER,
    "mentorAssignMethod" TEXT,
    "hodUserId" INTEGER,
    "mentorStatus" "GatePassStatus" NOT NULL DEFAULT 'PENDING',
    "hodStatus" "GatePassStatus" NOT NULL DEFAULT 'PENDING',
    "mentorNote" TEXT,
    "hodNote" TEXT,
    "mentorDecidedAt" TIMESTAMP(3),
    "hodDecidedAt" TIMESTAMP(3),
    "qrTokenHash" TEXT,
    "qrExpiresAt" TIMESTAMP(3),
    "qrConsumedAt" TIMESTAMP(3),
    "actualOutTime" TIMESTAMP(3),
    "actualInTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gate_passes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gate_passes_qrTokenHash_key" ON "gate_passes"("qrTokenHash");

-- CreateIndex
CREATE INDEX "gate_passes_studentId_idx" ON "gate_passes"("studentId");

-- CreateIndex
CREATE INDEX "gate_passes_mentorTeacherId_idx" ON "gate_passes"("mentorTeacherId");

-- AddForeignKey
ALTER TABLE "gate_passes" ADD CONSTRAINT "gate_passes_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gate_passes" ADD CONSTRAINT "gate_passes_mentorTeacherId_fkey" FOREIGN KEY ("mentorTeacherId") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
