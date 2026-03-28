import prisma from "../lib/prisma";
import {Request, Response} from "express";
import {evaluateAnswer} from "../services/ai.service";

export const submitAnswer = async(req: Request, res: Response) =>{
    const { interviewId, questionId, content} = req.body;

    const question = await prisma.question.findUnique({
        where: {id: questionId}
    });

    const aiResult = await evaluateAnswer(
        question?.content || "",// 수정사항
        content
    );

    const answer = await prisma.answer.create({
        data: {
            interviewId,
            questionId,
            content,
            aiScore: aiResult.score,       
            aiFeedback: aiResult.feedback
        }
    });

    res.json(answer);
}