import {Request, Response,NextFunction} from "express";
import {verifyToken} from "../utils/jwt";


export const authMiddleware = (
    req: Request,
    res: Response,
    next : NextFunction
) => {
    const authHeader = req.headers.authorization;

    if(!authHeader){
        return res.status(401).json({
            error : "Token required"
        })
    }
    const token = authHeader.startsWith("Bearer ")? authHeader.split(" ")[1] : null;
    if(!token){
        return res.status(401).json({
            error: "Invalid token"
        })
    }

    try {
        const decoded = verifyToken(token);
        (req as any).user = decoded;

        next();
    }catch (error){
        return res.status(401).json({
            error: "Invalid token"
        })
    }
};
