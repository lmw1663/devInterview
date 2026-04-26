import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import redis from "../lib/redis";

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Token required" });
  }

  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    return res.status(401).json({ error: "Invalid token" });
  }

  const isBlacklisted = await redis.exists(`blacklist:${token}`);
  if (isBlacklisted) {
    return res.status(401).json({ error: "Token has been revoked" });
  }

  try {
    const decoded = verifyToken(token);
    (req as any).user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
};

export const blacklistToken = async (token: string): Promise<void> => {
  try {
    const decoded = verifyToken(token) as { exp?: number };
    const now = Math.floor(Date.now() / 1000);
    const ttl = decoded.exp ? decoded.exp - now : 60 * 60 * 24 * 7;
    if (ttl > 0) await redis.setex(`blacklist:${token}`, ttl, "1");
  } catch {
    // 만료된 토큰은 블랙리스트 저장 불필요
  }
};
