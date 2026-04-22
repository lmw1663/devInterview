/*
  Warnings:

  - You are about to drop the column `interviewId` on the `Answer` table. All the data in the column will be lost.
  - You are about to drop the column `order` on the `Answer` table. All the data in the column will be lost.
  - You are about to drop the column `questionId` on the `Answer` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[interviewQuestionId]` on the table `Answer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[interviewId,order]` on the table `InterviewQuestion` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[interviewId,questionId]` on the table `InterviewQuestion` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `interviewQuestionId` to the `Answer` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Answer" DROP CONSTRAINT "Answer_interviewId_fkey";

-- DropForeignKey
ALTER TABLE "Answer" DROP CONSTRAINT "Answer_questionId_fkey";

-- AlterTable
ALTER TABLE "Answer" DROP COLUMN "interviewId",
DROP COLUMN "order",
DROP COLUMN "questionId",
ADD COLUMN     "interviewQuestionId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Answer_interviewQuestionId_key" ON "Answer"("interviewQuestionId");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewQuestion_interviewId_order_key" ON "InterviewQuestion"("interviewId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewQuestion_interviewId_questionId_key" ON "InterviewQuestion"("interviewId", "questionId");

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_interviewQuestionId_fkey" FOREIGN KEY ("interviewQuestionId") REFERENCES "InterviewQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
