import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export const evaluateAnswer = async(
    question: string,
    answer: string
) =>{
    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages:[
            {
            role: "system",
            content: "you are a technical interviewer."
        },
        {
            role:"user",
            content: `
            Return ONLY JSON like this:
            
            {
              "score": number,
              "feedback": string
            }
            
            Question:
            ${question}
            
            Answer:
            ${answer}
            `
      }
    ]
  });
  const text = response.choices[0].message.content;

  try{
    return JSON.parse(text || "{}");
  }catch{
    return{
        score: 0,
        feedback: text
    }
  }

};