import express from "express";
import { registerUser, loginUser, getProfile, logoutUser } from "../controllers/user.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", authMiddleware, logoutUser);
router.get("/profile", authMiddleware, getProfile);

export default router;