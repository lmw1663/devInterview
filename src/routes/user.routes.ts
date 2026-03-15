import express from "express";
import {registerUser} from "../controllers/user.controller";
import {loginUser} from "../controllers/user.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { getProfile } from "../controllers/user.controller";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/profile", authMiddleware, getProfile);
export default router;