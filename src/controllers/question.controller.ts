import { Request, Response } from "express";
import {
    getAllQuestions,
    getQuestionById
} from "../services/question.service";

export const fetchQuestions = async (req: Request, res: Response) => {
    try {
        const questions = await getAllQuestions();
        res.json(questions);
    } catch (error) {
        res.status(500).json({message: "Failed to fetch questions"});
    }
};

export const fetchQuestion = async (req: Request, res: Response) => {
    try {
      const rawId = req.params.id; // string | string[]
  
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
  
      if (typeof id !== "string" || id.length === 0) {
        return res.status(400).json({ message: "Invalid id" });
      }
  
      const question = await getQuestionById(id);
      res.json(question);
    } catch (error) {
      res.status(500).json({ error: "failed to fetch question" });
    }
  };
