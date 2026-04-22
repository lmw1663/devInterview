import prisma from "../lib/prisma";
import { Request, Response } from "express";
import { evaluateAnswer, evaluateAnswersBatch } from "../services/ai.service";

type SubmitItem = { interviewQuestionId?: string; content?: string };

async function createAnswerForSlot(interviewQuestionId: string, content: string) {
  const slot = await prisma.interviewQuestion.findUnique({
    where: { id: interviewQuestionId },
    include: { question: true },
  });

  if (!slot?.question) {
    throw new Error("InterviewQuestion not found");
  }

  const aiResult = await evaluateAnswer(slot.question.content || "", content);

  return prisma.answer.upsert({
    where: { interviewQuestionId },
    create: {
      interviewQuestionId,
      content,
      aiScore: aiResult.score,
      aiFeedback: aiResult.feedback,
    },
    update: {
      content,
      aiScore: aiResult.score,
      aiFeedback: aiResult.feedback,
    },
  });
}

export const submitAnswer = async (req: Request, res: Response) => {
  try {
    const { interviewQuestionId, content } = req.body as SubmitItem;
    if (!interviewQuestionId || typeof content !== "string") {
      return res.status(400).json({ error: "interviewQuestionId and content are required" });
    }

    const answer = await createAnswerForSlot(interviewQuestionId, content);
    res.json(answer);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to submit answer";
    res.status(500).json({ error: message });
  }
};

type Row =
  | {
      interviewQuestionId: string;
      ok: true;
      answer: Awaited<ReturnType<typeof createAnswerForSlot>>;
    }
  | { interviewQuestionId: string; ok: false; error: string };

/**
 * 여러 슬롯 답변을 한 HTTP 요청으로 제출.
 * DB 슬롯 조회 1회 + OpenAI 호출 1회 + Answer 생성은 항목별.
 */
export const submitAnswersBatch = async (req: Request, res: Response) => {
  const { items } = req.body as { items?: SubmitItem[] };

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      error: "items must be a non-empty array of { interviewQuestionId, content }",
    });
  }

  const results: Row[] = [];
  type ValidRow = { id: string; content: string };
  const validRows: ValidRow[] = [];

  for (const item of items) {
    const id = item.interviewQuestionId;
    const content = item.content;

    if (!id || typeof content !== "string") {
      results.push({
        interviewQuestionId: id ?? "",
        ok: false,
        error: "interviewQuestionId and content are required per item",
      });
      continue;
    }
    validRows.push({ id, content });
  }

  if (validRows.length === 0) {
    const failed = results.filter((r) => !r.ok).length;
    const status = failed === results.length ? 500 : 207;
    return res.status(status).json({ results });
  }

  const ids = [...new Set(validRows.map((r) => r.id))];
  const slots = await prisma.interviewQuestion.findMany({
    where: { id: { in: ids } },
    include: { question: true },
  });
  const slotById = new Map(slots.map((s) => [s.id, s]));

  const batchForAi: { interviewQuestionId: string; question: string; answer: string; content: string }[] =
    [];

  for (const row of validRows) {
    const slot = slotById.get(row.id);
    if (!slot?.question) {
      results.push({
        interviewQuestionId: row.id,
        ok: false,
        error: "InterviewQuestion not found",
      });
      continue;
    }
    batchForAi.push({
      interviewQuestionId: row.id,
      question: slot.question.content || "",
      answer: row.content,
      content: row.content,
    });
  }

  if (batchForAi.length === 0) {
    const failed = results.filter((r) => !r.ok).length;
    const status = failed === results.length ? 500 : 207;
    return res.status(status).json({ results });
  }

  let evaluations: Awaited<ReturnType<typeof evaluateAnswersBatch>>;
  try {
    evaluations = await evaluateAnswersBatch(
      batchForAi.map((b) => ({
        interviewQuestionId: b.interviewQuestionId,
        question: b.question,
        answer: b.answer,
      }))
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "AI batch evaluation failed";
    for (const b of batchForAi) {
      results.push({
        interviewQuestionId: b.interviewQuestionId,
        ok: false,
        error: message,
      });
    }
    const failed = results.filter((r) => !r.ok).length;
    const status = failed === results.length ? 500 : 207;
    return res.status(status).json({ results });
  }

  const evalById = new Map(evaluations.map((e) => [e.interviewQuestionId, e]));

  for (const b of batchForAi) {
    const ev = evalById.get(b.interviewQuestionId);
    if (!ev) {
      results.push({
        interviewQuestionId: b.interviewQuestionId,
        ok: false,
        error: "Missing AI result for slot",
      });
      continue;
    }

    try {
      const answer = await prisma.answer.upsert({
        where: { interviewQuestionId: b.interviewQuestionId },
        create: {
          interviewQuestionId: b.interviewQuestionId,
          content: b.content,
          aiScore: ev.score,
          aiFeedback: ev.feedback,
        },
        update: {
          content: b.content,
          aiScore: ev.score,
          aiFeedback: ev.feedback,
        },
      });
      results.push({ interviewQuestionId: b.interviewQuestionId, ok: true, answer });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      results.push({
        interviewQuestionId: b.interviewQuestionId,
        ok: false,
        error: message,
      });
    }
  }

  const failed = results.filter((r) => !r.ok).length;
  const status = failed === results.length ? 500 : failed > 0 ? 207 : 200;

  res.status(status).json({ results });
};
