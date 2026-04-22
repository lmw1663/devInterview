import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type BatchEvalItem = {
  interviewQuestionId: string;
  question: string;
  answer: string;
};

export type BatchEvalResult = {
  interviewQuestionId: string;
  score: number;
  feedback: string;
};

export const evaluateAnswer = async (question: string, answer: string) => {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "you are a technical interviewer.",
      },
      {
        role: "user",
        content: `
            Return ONLY JSON like this:
            
            {
              "score": number,
              "feedback": string
            }
            
            Question:
            ${question}
            
            Answer:
            ${answer}
            `,
      },
    ],
  });
  const text = response.choices[0].message.content;

  try {
    return JSON.parse(text || "{}") as { score?: number; feedback?: string };
  } catch {
    return {
      score: 0,
      feedback: text,
    };
  }
};

/**
 * 여러 (질문, 답변) 쌍을 한 번의 채팅 완성으로 평가 (API 호출 1회).
 */
export const evaluateAnswersBatch = async (
  items: BatchEvalItem[]
): Promise<BatchEvalResult[]> => {
  if (items.length === 0) {
    return [];
  }

  const blocks = items
    .map(
      (item, i) =>
        `Item ${i + 1} — interviewQuestionId: "${item.interviewQuestionId}"
Question:
${item.question}

Answer:
${item.answer}`
    )
    .join("\n\n---\n\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a technical interviewer. Evaluate each item independently. Be concise in feedback.",
      },
      {
        role: "user",
        content: `Return ONLY a JSON array (no markdown fences, no extra text). Each element must be exactly:
{"interviewQuestionId": string, "score": number, "feedback": string}

score is 0-100. The array length must be ${items.length} and order must match the items below (same order as Item 1, Item 2, ...).

${blocks}`,
      },
    ],
  });

  const raw = response.choices[0].message.content?.trim() ?? "[]";
  let jsonText = raw;
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("Failed to parse AI batch JSON");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("AI batch response is not a JSON array");
  }

  const byId = new Map<string, BatchEvalResult>();
  for (const row of parsed) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const id = String(r.interviewQuestionId ?? "");
    if (!id) continue;
    byId.set(id, {
      interviewQuestionId: id,
      score: typeof r.score === "number" ? r.score : Number(r.score) || 0,
      feedback: typeof r.feedback === "string" ? r.feedback : String(r.feedback ?? ""),
    });
  }    

  // 요청 순서와 id 기준으로 맞춤 (모델이 id만 채워도 매칭 가능)
  return items.map((item) => {
    const hit = byId.get(item.interviewQuestionId);
    if (hit) return hit;
    return {
      interviewQuestionId: item.interviewQuestionId,
      score: 0,
      feedback: "Missing evaluation for this item in AI response.",
    };
  });
};
