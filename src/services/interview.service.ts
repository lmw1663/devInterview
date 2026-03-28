import prisma from "../lib/prisma";

export const startInterview = async (userId: string) => {

    return prisma.interviewSession.create({
        data: {
            userId
        }
    });
}

export const getRandomQuestions = async () =>{
    const questions = await prisma.question.findMany();

    const random = questions[Math.floor(Math.random() * questions.length)];

    return random;
}

export const getInterviewResult = async (interviewId: string) =>{

    const answers = await prisma.answer.findMany({
        where: {interviewId}
    });

    const total = answers.reduce(
        (sum, a) => sum + (a.aiScore || 0),0
    );

    const avg = answers.length? total/answers.length:0;
    return {
        totalQuestions: answers.length,
        averageScore: avg,
        answers
    };
}