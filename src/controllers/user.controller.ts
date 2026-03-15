import {Request, Response} from "express";
import prisma from "../lib/prisma";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const registerUser = async (req: Request, res: Response)  => {
    try {
        //잘못된 타입이어도 다음단계로 넘어가는데 나중에 개선해야함
        const {email, password} = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);
        //email 중복 체크 필요
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
            }
        });
        //나중에 응답에서 비밀번호 제외
        //상태코드 생성 성공시 201 created 요청 보내기
        res.json(user);
    } catch (error) {
        res.status(500).json({message: "Internal server error"});
    }
}

export const loginUser = async (req: Request, res: Response) => {
    try {
        const {email,password} = req.body;
        
        const user = await prisma.user.findUnique({
            where: {email}
        });

        if(!user){
            return res.status(404).json({error: "user not found"});
        }
        const isValid = await bcrypt.compare(password, user.password);
        if(!isValid){
            return res.status(401).json({error : "Invalid password"});
        }
        const token = jwt.sign({userId: user.id}, process.env.JWT_SECRET || "secret",
            {expiresIn: "7d"}
        );

        res.json({token,userId: user.id});
    } catch (error) {
        res.status(500).json({message: "Login failed"});

    }
};