import { prisma } from "../lib/prisma";

export const getAllQuestions = async () => {
    return prisma.question.findMany();
};

export const getQuestionById = async (id: string) =>{
    return prisma.question.findUnique({
        where: {id}
    });
}



export const getQuestionByCategory = async (category: string, count: number ) =>{
    const questions = await prisma.question.findMany({
        where: {category}
    });
    if(questions.length < count){
        throw new Error("질문이 부족합니다.");
    }
    const shuffled = questions.sort(() => 0.5 - Math.random());
    return shuffled.slice(0,count);
}