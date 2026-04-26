# Coding Conventions

## 레이어 규칙

| 레이어 | 역할 | 규칙 |
|--------|------|------|
| `routes/` | 엔드포인트 정의, 미들웨어 연결 | 로직 없음 |
| `controllers/` | req 파싱 → service/queue 호출 → res 반환 | DB 직접 접근 금지 |
| `services/` | 비즈니스 로직, DB 쿼리 | HTTP 객체(req/res) 사용 금지 |
| `queues/` | BullMQ Queue 정의, 잡 옵션 | 처리 로직 없음 |
| `workers/` | BullMQ Worker, 잡 처리 로직 | HTTP 객체 사용 금지 |
| `middlewares/` | 인증, 블랙리스트 등 공통 처리 | |

## Prisma 클라이언트

`src/lib/prisma.ts`의 싱글턴만 사용. 직접 `new PrismaClient()` 생성 금지.

```typescript
import prisma from "../lib/prisma";
```

## Redis 클라이언트

`src/lib/redis.ts`의 싱글턴만 사용. 직접 `new Redis()` 생성 금지.

```typescript
import redis from "../lib/redis";
```

Redis 키 명명 규칙:
- `questions:all` — 전체 질문 목록 캐시
- `questions:{id}` — 개별 질문 캐시
- `blacklist:{token}` — 로그아웃된 JWT 블랙리스트
- `rl:::` — Rate Limit 카운터 (express-rate-limit 자동 생성)
- `bull:*` — BullMQ 잡 데이터 (자동 생성)

## Logger

`src/lib/logger.ts`의 pino 싱글턴만 사용. `console.log` / `console.error` 사용 금지.

```typescript
import logger from "../lib/logger";

logger.info({ jobId }, "ai-worker: job completed");
logger.error({ jobId, err: err.message }, "ai-worker: job failed");
```

## 환경 변수

`src/config/env.ts`에서만 import. `process.env` 직접 참조 금지.

```typescript
import { env } from "../config/env";
```

| 변수 | 용도 |
|------|------|
| `PORT` | 서버 포트 (기본 3000) |
| `JWT_SECRET` | JWT 서명 키 |
| `DATABASE_URL` | PostgreSQL 연결 문자열 |
| `REDIS_URL` | Redis 연결 URL (기본 redis://localhost:6379) |
| `OPENAI_API_KEY` | OpenAI API 키 |
| `CORS_ORIGIN` | 허용 Origin (기본 `*`) |
| `NODE_ENV` | 실행 환경 (development / production) |
| `LOG_LEVEL` | pino 로그 레벨 (기본 info) |

## AI 채점 (비동기 큐 방식)

답변 제출 시 OpenAI를 직접 호출하지 않는다. BullMQ 큐에 잡을 등록하고 즉시 jobId를 반환한다.

```
controller → aiQueue.add("evaluate", jobData) → { jobId, status: "queued" } (202)
                    ↓
             ai.worker → evaluateAnswer() → prisma.answer.upsert()
                    ↓
client polls GET /api/answers/status/:jobId → { status: "completed", answer: {...} }
```

- Queue 정의: `src/queues/ai.queue.ts`
- Worker 구현: `src/workers/ai.worker.ts`
- 재시도: attempts 3회, exponential backoff (2s → 4s → 8s)
- 동시 처리: concurrency 5

## 커밋 메시지

- 한국어, 1줄, "왜"에 초점
- 민감 파일(`.env*`, `*.key`, `*.pem`, `.DS_Store`) 제외

## 타입

- Express `req.user` 타입은 `auth.middleware.ts`에 module augmentation으로 선언됨
- 새 모델 추가 후 반드시 `npx prisma generate` 실행
