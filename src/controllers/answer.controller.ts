import prisma from "../lib/prisma";
import { Request, Response } from "express";
import { aiQueue } from "../queues/ai.queue";

type SubmitItem = { interviewQuestionId?: string; content?: string };

export const submitAnswer = async (req: Request, res: Response) => {
  try {
    const { interviewQuestionId, content } = req.body as SubmitItem;
    if (!interviewQuestionId || typeof content !== "string") {
      return res.status(400).json({ error: "interviewQuestionId and content are required" });
    }

    const slot = await prisma.interviewQuestion.findUnique({
      where: { id: interviewQuestionId },
      include: { question: true },
    });

    if (!slot?.question) {
      return res.status(404).json({ error: "InterviewQuestion not found" });
    }

    const job = await aiQueue.add("evaluate", {
      interviewQuestionId,
      questionContent: slot.question.content || "",
      answerContent: content,
    });

    res.status(202).json({ jobId: job.id, status: "queued" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to submit answer";
    res.status(500).json({ error: message });
  }
};

export const submitAnswersBatch = async (req: Request, res: Response) => {
  const { items } = req.body as { items?: SubmitItem[] };

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      error: "items must be a non-empty array of { interviewQuestionId, content }",
    });
  }

  const results: { interviewQuestionId: string; ok: boolean; jobId?: string; error?: string }[] = [];

  const validItems = items.filter(
    (item): item is { interviewQuestionId: string; content: string } =>
      !!item.interviewQuestionId && typeof item.content === "string"
  );

  const invalidItems = items.filter(
    (item) => !item.interviewQuestionId || typeof item.content !== "string"
  );

  for (const item of invalidItems) {
    results.push({
      interviewQuestionId: item.interviewQuestionId ?? "",
      ok: false,
      error: "interviewQuestionId and content are required per item",
    });
  }

  if (validItems.length === 0) {
    return res.status(400).json({ results });
  }

  const ids = [...new Set(validItems.map((r) => r.interviewQuestionId))];
  const slots = await prisma.interviewQuestion.findMany({
    where: { id: { in: ids } },
    include: { question: true },
  });
  const slotById = new Map(slots.map((s) => [s.id, s]));

  for (const item of validItems) {
    const slot = slotById.get(item.interviewQuestionId);
    if (!slot?.question) {
      results.push({
        interviewQuestionId: item.interviewQuestionId,
        ok: false,
        error: "InterviewQuestion not found",
      });
      continue;
    }

    try {
      const job = await aiQueue.add("evaluate", {
        interviewQuestionId: item.interviewQuestionId,
        questionContent: slot.question.content || "",
        answerContent: item.content,
      });
      results.push({ interviewQuestionId: item.interviewQuestionId, ok: true, jobId: job.id });
    } catch (e) {
      results.push({
        interviewQuestionId: item.interviewQuestionId,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const failed = results.filter((r) => !r.ok).length;
  const status = failed === results.length ? 500 : failed > 0 ? 207 : 202;
  res.status(status).json({ results });
};

export const getAnswerStatus = async (req: Request, res: Response) => {
  try {
    const jobId = req.params.jobId as string;
    const job = await aiQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const state = await job.getState();
    const returnValue = job.returnvalue;

    if (state === "completed" && returnValue?.interviewQuestionId) {
      const answer = await prisma.answer.findUnique({
        where: { interviewQuestionId: returnValue.interviewQuestionId },
      });
      return res.json({ jobId, status: state, answer });
    }

    if (state === "failed") {
      return res.json({ jobId, status: state, error: job.failedReason });
    }

    res.json({ jobId, status: state });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to get job status";
    res.status(500).json({ error: message });
  }
};
