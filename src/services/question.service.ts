import { prisma } from "../lib/prisma";
import redis from "../lib/redis";

const CACHE_TTL = 60 * 60; // 1시간

export const getAllQuestions = async () => {
  const cacheKey = "questions:all";
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const questions = await prisma.question.findMany();
  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(questions));
  return questions;
};

export const getQuestionById = async (id: string) => {
  const cacheKey = `questions:${id}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const question = await prisma.question.findUnique({ where: { id } });
  if (question) await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(question));
  return question;
};

export const getQuestionByCategory = async (category: string, count: number) => {
  const questions = await prisma.question.findMany({ where: { category } });
  if (questions.length < count) throw new Error("질문이 부족합니다.");
  const shuffled = questions.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};
