import { prisma } from "../lib/prisma";

export const getAllQuestions = async () => {
    return prisma.question.findMany();
};

export const getQuestionById = async (id: string) =>{
    return prisma.question.findUnique({
        where: {id}
    });
}