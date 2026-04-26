import express from "express";
import { submitAnswer, submitAnswersBatch, getAnswerStatus } from "../controllers/answer.controller";

const router = express.Router();

router.post("/submit", submitAnswer);
router.post("/submit-batch", submitAnswersBatch);
router.get("/status/:jobId", getAnswerStatus);

export default router;