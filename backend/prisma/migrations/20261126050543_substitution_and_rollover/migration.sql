-- AlterTable
ALTER TABLE "attendance_sessions" ADD COLUMN     "conductedByTeacherId" INTEGER,
ADD COLUMN     "isSubstitution" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "sections" ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "currentSemester" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "class_adjustments" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "period" INTEGER NOT NULL,
    "sectionId" INTEGER NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "originalTeacherId" INTEGER NOT NULL,
    "substituteTeacherId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "reason" TEXT,
    "assignedBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "semester_promotion_logs" (
    "id" SERIAL NOT NULL,
    "sourceSectionId" INTEGER NOT NULL,
    "targetSectionId" INTEGER NOT NULL,
    "promotedCount" INTEGER NOT NULL,
    "academicYearId" INTEGER NOT NULL,
    "promotedBy" INTEGER NOT NULL,
    "promotedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "semester_promotion_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "class_adjustments_date_period_sectionId_key" ON "class_adjustments"("date", "period", "sectionId");

-- AddForeignKey
ALTER TABLE "class_adjustments" ADD CONSTRAINT "class_adjustments_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_adjustments" ADD CONSTRAINT "class_adjustments_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_adjustments" ADD CONSTRAINT "class_adjustments_originalTeacherId_fkey" FOREIGN KEY ("originalTeacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_adjustments" ADD CONSTRAINT "class_adjustments_substituteTeacherId_fkey" FOREIGN KEY ("substituteTeacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semester_promotion_logs" ADD CONSTRAINT "semester_promotion_logs_sourceSectionId_fkey" FOREIGN KEY ("sourceSectionId") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semester_promotion_logs" ADD CONSTRAINT "semester_promotion_logs_targetSectionId_fkey" FOREIGN KEY ("targetSectionId") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
