import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { startInterviewController, getInterviewResultController } from "../controllers/interview.controller";

const router = express.Router();

router.post("/start", authMiddleware, startInterviewController);
router.get("/result/:interviewId", authMiddleware, getInterviewResultController);
export default router;