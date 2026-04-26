# Architecture

Express + TypeScript 기술 면접 연습 플랫폼.

## 요청 흐름

### 일반 요청 (질문 조회, 인터뷰 시작 등)

```mermaid
flowchart LR
    Client -->|HTTP| MW["helmet / cors\nrateLimit / pinoHttp"]
    MW --> Routes
    Routes -->|authMiddleware| Controllers
    Controllers --> Services
    Services -->|cache-aside| Redis
    Services -->|Prisma| PostgreSQL
```

### 답변 제출 — 비동기 큐 흐름

```mermaid
flowchart TD
    Client -->|POST /submit| Controller["answer.controller\n→ aiQueue.add()"]
    Controller -->|202 + jobId| Client

    Controller --> Queue["BullMQ Queue\n(Redis 저장)"]
    Queue --> Worker["ai.worker\nconcurrency 5"]
    Worker --> AI["ai.service\nOpenAI 호출"]
    AI --> DB[(PostgreSQL)]

    Client -->|GET /status/:jobId| StatusCtrl["answer.controller\n→ getAnswerStatus()"]
    StatusCtrl -->|job state + answer| Client
```

## 미들웨어 스택 (적용 순서)

```
요청
  ↓ helmet()         — HTTP 보안 헤더 (XSS, Clickjacking 방어)
  ↓ cors()           — CORS_ORIGIN 환경변수 기반 허용
  ↓ express.json()   — 바디 파싱
  ↓ pinoHttp()       — 구조화 HTTP 로깅
  ↓ rateLimit()      — /api 전체 분당 20회 (Redis 기반)
  ↓ authMiddleware() — JWT 검증 + 블랙리스트 확인 (보호된 라우트만)
  ↓ 라우트 핸들러
```

## 레이어 구조

```mermaid
flowchart TD
    R["routes/\n엔드포인트 정의"] --> C["controllers/\nreq 파싱 · res 반환"]
    C --> S["services/\n비즈니스 로직 · DB 쿼리"]
    C --> Q["queues/\nBullMQ Queue 정의"]
    Q --> W["workers/\nBullMQ Worker\nOpenAI 호출 → DB 저장"]
    S -->|cache-aside| RD["lib/redis.ts\nioredis 싱글턴"]
    S --> P["lib/prisma.ts\nPrismaClient 싱글턴"]
    P --> DB[(PostgreSQL\nSupabase)]
    W --> P
    M["middlewares/\nauthMiddleware\n+ blacklistToken"] -.->|JWT 검증\n블랙리스트 확인| C
    M -.-> RD
    ENV["config/env.ts\nPORT · JWT_SECRET · DATABASE_URL\nREDIS_URL · OPENAI_API_KEY\nCORS_ORIGIN · NODE_ENV"] -.-> S
    LOG["lib/logger.ts\npino 싱글턴"] -.-> W
```

## 인프라

| 구성 요소 | 역할 |
|------|------|
| PostgreSQL (Supabase) | 주 데이터 저장소 |
| Redis | BullMQ 백엔드 / 질문 캐시 / JWT 블랙리스트 / Rate Limit 카운터 |
| OpenAI API | AI 채점 (ai.worker 내부에서 호출) |

## DB 모델 관계

```mermaid
erDiagram
    User ||--o{ InterviewSession : "has"
    InterviewSession ||--o{ InterviewQuestion : "contains"
    Question ||--o{ InterviewQuestion : "used in"
    InterviewQuestion ||--o| Answer : "has"

    User {
        uuid id PK
        string email
        string password
    }
    InterviewSession {
        uuid id PK
        uuid userId FK
        string category
        int questionCount
    }
    InterviewQuestion {
        uuid id PK
        uuid interviewId FK
        uuid questionId FK
        int order
    }
    Question {
        uuid id PK
        string category
        string content
    }
    Answer {
        uuid id PK
        uuid interviewQuestionId FK
        string content
        int aiScore
        string aiFeedback
    }
```
