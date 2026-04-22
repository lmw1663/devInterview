import express from "express";
import { submitAnswer, submitAnswersBatch } from "../controllers/answer.controller";

const router = express.Router();

router.post("/submit", submitAnswer);
router.post("/submit-batch", submitAnswersBatch);

export default router;