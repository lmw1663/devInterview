/*
  Warnings:

  - You are about to drop the column `answerText` on the `Answer` table. All the data in the column will be lost.
  - You are about to drop the column `scoreTotal` on the `Answer` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Answer` table. All the data in the column will be lost.
  - You are about to drop the column `difficulty` on the `Question` table. All the data in the column will be lost.
  - Added the required column `content` to the `Answer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `interViewId` to the `Answer` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Answer" DROP CONSTRAINT "Answer_userId_fkey";

-- AlterTable
ALTER TABLE "Answer" DROP COLUMN "answerText",
DROP COLUMN "scoreTotal",
DROP COLUMN "userId",
ADD COLUMN     "aiFeedback" TEXT,
ADD COLUMN     "aiScore" INTEGER,
ADD COLUMN     "content" TEXT NOT NULL,
ADD COLUMN     "interViewId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Question" DROP COLUMN "difficulty";

-- CreateTable
CREATE TABLE "InterviewSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewSession_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_interViewId_fkey" FOREIGN KEY ("interViewId") REFERENCES "InterviewSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
