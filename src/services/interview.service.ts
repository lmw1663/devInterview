import prisma from "../lib/prisma";
import {getQuestionByCategory} from "./question.service";



export const startInterviewWithQuestions = async(
    userId: string,
    category: string,
    questionCount: number
) =>{
    //1. 질문 가져오기
    const questions = await getQuestionByCategory(category, questionCount);
    //2. 인터뷰 생성
    const interview = await prisma.interviewSession.create({
        data:{
            userId,
            category,
            questionCount
            
        }
    });
    //3. 질문 저장
    const interviewQuestions = await Promise.all(
        questions.map((q, index)=>
            prisma.interviewQuestion.create({
                data: {
                    interviewId: interview.id,
                    questionId: q.id,
                    order: index
                }
            }))
    );
    return {
        interviewId: interview.id,
        interviewQuestions,
        questions
    }
}


export const getInterviewResult = async (interviewId: string) =>{

    const session = await prisma.interviewSession.findUnique({
        where: { id: interviewId},
        include: {
            interviewQuestions: {
                orderBy: {order: "asc"},
                include: {
                    question: {
                        select:{
                            id: true,
                            category: true,
                            content: true,
                        },
                    },
                    answer:{
                        select: {
                            id: true,
                            content: true,
                            audioURI: true,
                            duration: true,
                            aiScore: true,
                            aiFeedback: true,
                            createdAt: true,
                        }
                    }
                }
            }
        }
    });
    if (!session) {
        return null;
    }
    const answersWithScore = session.interviewQuestions.map((slot) => slot.answer).filter((a): a is NonNullable<typeof a> => a!=null)
    const totalScore = answersWithScore.reduce((sum, a) => sum + (a.aiScore ?? 0), 0);
  const averageScore = answersWithScore.length
    ? totalScore / answersWithScore.length
    : 0;
  return {
    interviewId: session.id,
    category: session.category,
    questionCount: session.questionCount,
    averageScore,
    slots: session.interviewQuestions.map((slot) => ({
      order: slot.order,
      question: slot.question,
      answer: slot.answer, // 없으면 아직 미응답
    })),
  };
};