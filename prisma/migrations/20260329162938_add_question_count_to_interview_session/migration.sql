/*
  Warnings:

  - Added the required column `questionCount` to the `InterviewSession` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "InterviewSession" ADD COLUMN     "questionCount" INTEGER NOT NULL;
