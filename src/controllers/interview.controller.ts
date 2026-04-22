import {Request, Response} from "express";
import {startInterviewWithQuestions, getInterviewResult} from "../services/interview.service";



export const startInterviewController = async(req: Request, res: Response) =>{
    const userId = (req as any).user.userId;
    const category = req.body.category;
    const questionCount = req.body.questionCount;
    const interview = await startInterviewWithQuestions(userId, category, questionCount);
    res.json(interview);
}

export const getInterviewResultController = async(req: Request, res: Response) =>{
    const interviewId = req.params.interviewId as string;
    const result = await getInterviewResult(interviewId);
    res.json(result);
}