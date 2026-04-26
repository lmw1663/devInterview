import { Worker, Job } from "bullmq";
import redis from "../lib/redis";
import prisma from "../lib/prisma";
import { evaluateAnswer } from "../services/ai.service";
import type { AiJobData } from "../queues/ai.queue";
import logger from "../lib/logger";

export function startAiWorker() {
  const worker = new Worker<AiJobData>(
    "ai-evaluation",
    async (job: Job<AiJobData>) => {
      const { interviewQuestionId, questionContent, answerContent } = job.data;

      const aiResult = await evaluateAnswer(questionContent, answerContent);

      await prisma.answer.upsert({
        where: { interviewQuestionId },
        create: {
          interviewQuestionId,
          content: answerContent,
          aiScore: aiResult.score ?? 0,
          aiFeedback: aiResult.feedback ?? "",
        },
        update: {
          content: answerContent,
          aiScore: aiResult.score ?? 0,
          aiFeedback: aiResult.feedback ?? "",
        },
      });

      return { interviewQuestionId, score: aiResult.score, feedback: aiResult.feedback };
    },
    {
      connection: redis,
      concurrency: 5,
    }
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "ai-worker: job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, "ai-worker: job failed");
  });

  return worker;
}
