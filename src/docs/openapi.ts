/**
 * OpenAPI 3.0 — DevInterview API
 * Swagger UI: GET /api-docs
 */
export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "DevInterview API",
    version: "1.0.0",
    description:
      "면접 세션, 질문 풀, 답변 제출(AI 평가) API. 보호된 엔드포인트는 `Authorization: Bearer <JWT>` 헤더가 필요합니다.",
  },
  servers: [{ url: "http://localhost:3000", description: "로컬 개발" }],
  tags: [
    { name: "users", description: "회원가입, 로그인, 프로필" },
    { name: "questions", description: "질문 조회" },
    { name: "interviews", description: "인터뷰 시작, 결과" },
    { name: "answers", description: "답변 제출" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "로그인 응답의 `token` 값",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
          message: { type: "string" },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string" },
        },
      },
      LoginResponse: {
        type: "object",
        properties: {
          token: { type: "string" },
          userId: { type: "string", format: "uuid" },
        },
      },
      RegisterRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string" },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      StartInterviewRequest: {
        type: "object",
        required: ["category", "questionCount"],
        properties: {
          category: { type: "string", description: "질문 카테고리" },
          questionCount: {
            type: "integer",
            minimum: 1,
            description: "이 세션에서 뽑을 질문 개수",
          },
        },
      },
      StartInterviewResponse: {
        type: "object",
        properties: {
          interviewId: { type: "string", format: "uuid" },
          questions: {
            type: "array",
            items: { $ref: "#/components/schemas/Question" },
          },
        },
      },
      Question: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          category: { type: "string" },
          content: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      SubmitAnswerRequest: {
        type: "object",
        required: ["interviewQuestionId", "content"],
        properties: {
          interviewQuestionId: {
            type: "string",
            format: "uuid",
            description: "InterviewQuestion 슬롯 id",
          },
          content: { type: "string", description: "답변 본문" },
        },
      },
      SubmitAnswersBatchRequest: {
        type: "object",
        required: ["items"],
        properties: {
          items: {
            type: "array",
            minItems: 1,
            items: { $ref: "#/components/schemas/SubmitAnswerRequest" },
            description: "슬롯별 답변 목록 (한 번의 HTTP로 여러 건 제출)",
          },
        },
      },
      SubmitAnswersBatchResponse: {
        type: "object",
        properties: {
          results: {
            type: "array",
            items: {
              type: "object",
              required: ["interviewQuestionId", "ok"],
              properties: {
                interviewQuestionId: { type: "string" },
                ok: { type: "boolean" },
                answer: { $ref: "#/components/schemas/Answer" },
                error: { type: "string" },
              },
            },
          },
        },
      },
      Answer: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          interviewQuestionId: { type: "string" },
          content: { type: "string" },
          audioURI: { type: "string", nullable: true },
          duration: { type: "integer", nullable: true },
          aiScore: { type: "integer", nullable: true },
          aiFeedback: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      InterviewResult: {
        type: "object",
        properties: {
          interviewId: { type: "string" },
          category: { type: "string" },
          questionCount: { type: "integer" },
          averageScore: { type: "number" },
          slots: {
            type: "array",
            items: {
              type: "object",
              properties: {
                order: { type: "integer" },
                question: { $ref: "#/components/schemas/Question" },
                answer: { $ref: "#/components/schemas/Answer", nullable: true },
              },
            },
          },
        },
      },
    },
  },
  paths: {
    "/": {
      get: {
        summary: "헬스 체크",
        tags: [],
        responses: {
          "200": {
            description: "API 동작 중",
            content: {
              "text/plain": {
                schema: { type: "string", example: "DevInterview API Running" },
              },
            },
          },
        },
      },
    },
    "/api/users/register": {
      post: {
        tags: ["users"],
        summary: "회원가입",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "생성된 유저(비밀번호 해시 포함 — 운영에서는 제외 권장)",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/User" } },
            },
          },
          "500": {
            description: "생성 실패",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/api/users/login": {
      post: {
        tags: ["users"],
        summary: "로그인 (JWT 발급)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "토큰 및 userId",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginResponse" },
              },
            },
          },
          "401": { description: "비밀번호 불일치" },
          "404": { description: "유저 없음" },
          "500": { description: "서버 오류" },
        },
      },
    },
    "/api/users/profile": {
      get: {
        tags: ["users"],
        summary: "내 프로필 (JWT 필요)",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "비밀번호 제외 유저 정보",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/User" } },
            },
          },
          "401": { description: "토큰 없음/무효" },
          "404": { description: "유저 없음" },
          "500": { description: "서버 오류" },
        },
      },
    },
    "/api/questions": {
      get: {
        tags: ["questions"],
        summary: "질문 목록",
        responses: {
          "200": {
            description: "질문 배열",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Question" },
                },
              },
            },
          },
          "500": { description: "조회 실패" },
        },
      },
    },
    "/api/questions/{id}": {
      get: {
        tags: ["questions"],
        summary: "질문 단건",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "질문",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Question" } },
            },
          },
          "400": { description: "잘못된 id" },
          "500": { description: "조회 실패" },
        },
      },
    },
    "/api/interviews/start": {
      post: {
        tags: ["interviews"],
        summary: "인터뷰 시작 — 카테고리별 질문 뽑아 세션 생성",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/StartInterviewRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "interviewId 및 선택된 질문들",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/StartInterviewResponse" },
              },
            },
          },
          "401": { description: "인증 실패" },
          "500": { description: "서버 오류 (예: 해당 카테고리 질문 부족)" },
        },
      },
    },
    "/api/interviews/result/{interviewId}": {
      get: {
        tags: ["interviews"],
        summary: "인터뷰 결과 (슬롯별 질문·답·평균 점수)",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "interviewId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "결과",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/InterviewResult" },
              },
            },
          },
          "401": { description: "인증 실패" },
        },
      },
    },
    "/api/answers/submit": {
      post: {
        tags: ["answers"],
        summary: "답변 1건 제출 (AI 채점)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SubmitAnswerRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "저장된 Answer",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Answer" } },
            },
          },
          "400": { description: "필드 누락" },
          "500": { description: "저장/OpenAI 오류 등" },
        },
      },
    },
    "/api/answers/submit-batch": {
      post: {
        tags: ["answers"],
        summary: "답변 여러 건 한 번에 제출 (AI는 요청당 1회 호출, DB 저장은 항목별)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SubmitAnswersBatchRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "전부 성공",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SubmitAnswersBatchResponse" },
              },
            },
          },
          "207": {
            description: "일부만 성공 (results에 ok/error 혼재)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SubmitAnswersBatchResponse" },
              },
            },
          },
          "400": { description: "items 비어 있음" },
          "500": { description: "전부 실패" },
        },
      },
    },
  },
} as const;
