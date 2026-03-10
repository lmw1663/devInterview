import {Request, Response} from "express";
import prisma from "../lib/prisma";
import bcrypt from "bcrypt";

export const registerUser = async (req: Request, res: Response)  => {
    try {
        const {email, password} = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
            }
        });
        res.json(user);
    } catch (error) {
        res.status(500).json({message: "Internal server error"});
    }
}