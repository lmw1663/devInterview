import { Queue } from "bullmq";
import redis from "../lib/redis";

export type AiJobData = {
  interviewQuestionId: string;
  questionContent: string;
  answerContent: string;
};

export const aiQueue = new Queue<AiJobData>("ai-evaluation", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 200 },
  },
});
