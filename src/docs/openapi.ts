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
      "면접 세션, 질문 풀, 답변 제출(AI 비동기 평가) API. 보호된 엔드포인트는 `Authorization: Bearer <JWT>` 헤더가 필요합니다.",
  },
  servers: [{ url: "http://localhost:3000", description: "로컬 개발" }],
  tags: [
    { name: "system", description: "헬스 체크, 모니터링" },
    { name: "users", description: "회원가입, 로그인, 로그아웃, 프로필" },
    { name: "questions", description: "질문 조회" },
    { name: "interviews", description: "인터뷰 시작, 결과" },
    { name: "answers", description: "답변 제출, 상태 조회" },
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
      SubmitAnswerResponse: {
        type: "object",
        properties: {
          jobId: { type: "string", description: "BullMQ 잡 ID — /status/:jobId 로 폴링" },
          status: { type: "string", enum: ["queued"], example: "queued" },
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
                jobId: { type: "string", description: "성공 시 — /status/:jobId 로 폴링" },
                error: { type: "string", description: "실패 시 오류 메시지" },
              },
            },
          },
        },
      },
      JobStatusResponse: {
        type: "object",
        properties: {
          jobId: { type: "string" },
          status: {
            type: "string",
            enum: ["waiting", "active", "completed", "failed", "delayed"],
            description: "BullMQ 잡 상태",
          },
          answer: {
            allOf: [{ $ref: "#/components/schemas/Answer" }],
            nullable: true,
            description: "status가 completed일 때만 포함",
          },
          error: {
            type: "string",
            nullable: true,
            description: "status가 failed일 때만 포함",
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
      HealthResponse: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["ok", "error"] },
          db: { type: "string", example: "connected" },
          redis: { type: "string", example: "connected" },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["system"],
        summary: "DB · Redis 연결 상태 확인",
        responses: {
          "200": {
            description: "정상",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthResponse" },
              },
            },
          },
          "503": {
            description: "DB 또는 Redis 연결 실패",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
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
            description: "생성된 유저",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/User" } },
            },
          },
          "500": {
            description: "생성 실패",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
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
    "/api/users/logout": {
      post: {
        tags: ["users"],
        summary: "로그아웃 (토큰 블랙리스트 등록)",
        description:
          "현재 JWT를 Redis 블랙리스트에 등록한다. 이후 같은 토큰으로 요청 시 401 반환.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "로그아웃 성공",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { message: { type: "string", example: "Logged out successfully" } },
                },
              },
            },
          },
          "401": { description: "토큰 없음/무효/이미 블랙리스트" },
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
          "401": { description: "토큰 없음/무효/블랙리스트" },
          "404": { description: "유저 없음" },
          "500": { description: "서버 오류" },
        },
      },
    },
    "/api/questions": {
      get: {
        tags: ["questions"],
        summary: "질문 목록 (Redis 캐시 TTL 1시간)",
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
        summary: "질문 단건 (Redis 캐시 TTL 1시간)",
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
        summary: "답변 1건 제출 — 큐 등록 후 jobId 즉시 반환 (202)",
        description:
          "답변을 BullMQ 큐에 등록하고 즉시 jobId를 반환합니다. AI 채점은 워커가 백그라운드에서 처리합니다. 결과는 `GET /api/answers/status/:jobId`로 폴링하세요.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SubmitAnswerRequest" },
            },
          },
        },
        responses: {
          "202": {
            description: "큐 등록 성공 — jobId 반환",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SubmitAnswerResponse" },
                example: { jobId: "1", status: "queued" },
              },
            },
          },
          "400": { description: "필드 누락" },
          "404": { description: "InterviewQuestion 없음" },
          "500": { description: "서버 오류" },
        },
      },
    },
    "/api/answers/submit-batch": {
      post: {
        tags: ["answers"],
        summary: "답변 여러 건 제출 — 각 항목별 jobId 반환 (202/207)",
        description:
          "각 답변을 BullMQ 큐에 등록하고 jobId 목록을 반환합니다. 일부 실패 시 207 Multi-Status.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SubmitAnswersBatchRequest" },
            },
          },
        },
        responses: {
          "202": {
            description: "전부 큐 등록 성공",
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
    "/api/answers/status/{jobId}": {
      get: {
        tags: ["answers"],
        summary: "AI 평가 잡 상태 폴링",
        description:
          "submit 후 반환된 jobId로 처리 상태를 확인합니다. status가 `completed`이면 `answer` 필드에 AI 채점 결과가 포함됩니다.",
        parameters: [
          {
            name: "jobId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "POST /submit 응답의 jobId",
          },
        ],
        responses: {
          "200": {
            description: "잡 상태",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/JobStatusResponse" },
                examples: {
                  waiting: { value: { jobId: "1", status: "waiting" } },
                  active: { value: { jobId: "1", status: "active" } },
                  completed: {
                    value: {
                      jobId: "1",
                      status: "completed",
                      answer: { aiScore: 85, aiFeedback: "잘 설명했습니다." },
                    },
                  },
                  failed: { value: { jobId: "1", status: "failed", error: "OpenAI timeout" } },
                },
              },
            },
          },
          "404": { description: "jobId 없음" },
          "500": { description: "서버 오류" },
        },
      },
    },
  },
} as const;
