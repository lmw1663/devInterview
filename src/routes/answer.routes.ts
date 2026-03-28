import express from "express";
import { submitAnswer } from "../controllers/answer.controller";

const router = express.Router();

router.post("/submit", submitAnswer);

export default router;