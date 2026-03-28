import {Request, Response} from "express";
import {startInterview, getRandomQuestions, getInterviewResult} from "../services/interview.service";



export const startInterviewController = async(req: Request, res: Response) =>{
    const userId = (req as any).user.userId;

    const interview = await startInterview(userId);

    res.json(interview);
}

export const getRandomQuestionController = async(req: Request, res: Response) =>{
    const question = await getRandomQuestions();

    res.json(question);
}

export const getResultController = async(req: Request, res: Response) =>{
    const interviewId = req.params.interviewId as string;
    const result = await getInterviewResult(interviewId);
    res.json(result);
}