import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { startInterviewController, getRandomQuestionController, getResultController } from "../controllers/interview.controller";

const router = express.Router();

router.post("/start", authMiddleware, startInterviewController);
router.get("/question", authMiddleware, getRandomQuestionController);
router.get("/result/:interviewId", authMiddleware, getResultController);
export default router;