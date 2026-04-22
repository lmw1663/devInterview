/*
  Warnings:

  - You are about to drop the column `interViewId` on the `Answer` table. All the data in the column will be lost.
  - Added the required column `interviewId` to the `Answer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `order` to the `Answer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category` to the `InterviewSession` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Answer" DROP CONSTRAINT "Answer_interViewId_fkey";

-- AlterTable
ALTER TABLE "Answer" DROP COLUMN "interViewId",
ADD COLUMN     "audioURI" TEXT,
ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "interviewId" TEXT NOT NULL,
ADD COLUMN     "order" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "InterviewSession" ADD COLUMN     "category" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "InterviewQuestion" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "InterviewQuestion_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "InterviewSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewQuestion" ADD CONSTRAINT "InterviewQuestion_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "InterviewSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewQuestion" ADD CONSTRAINT "InterviewQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
