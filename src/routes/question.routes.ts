import express from "express";
import {
fetchQuestions,
fetchQuestion
} from "../controllers/question.controller";

const router = express.Router();

router.get("/", fetchQuestions);
router.get("/:id", fetchQuestion);

export default router;