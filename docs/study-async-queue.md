# Redis + BullMQ 비동기 큐 시스템 학습 정리

## 1. 왜 비동기 큐가 필요한가?

### 기존 문제 (동기 방식)

```
Client → POST /submit → OpenAI API 호출 (2~5초) → DB 저장 → 응답
```

- HTTP 요청이 OpenAI 응답을 **기다리는 동안 연결이 살아있어야** 함
- 트래픽이 몰리면 → OpenAI rate limit 초과, 서버 스레드 고갈
- OpenAI가 잠깐 느려지면 → 사용자는 타임아웃을 봄

### 개선된 방식 (비동기 큐)

```
Client → POST /submit → 큐에 잡 추가 → jobId 즉시 반환 (202)
                              ↓
                        Worker가 백그라운드에서 OpenAI 호출 → DB 저장
                              ↓
               Client → GET /status/:jobId → 결과 폴링
```

- HTTP 요청이 즉시 반환됨 (응답시간 < 50ms)
- OpenAI 호출은 Worker가 독립적으로 처리
- 실패하면 자동 재시도 (3번, exponential backoff)

---

## 2. Redis란?

**Redis (Remote Dictionary Server)** — 메모리 기반 키-값 저장소

### 주요 특징
- RAM에 데이터를 저장 → **초고속** (마이크로초 단위)
- 문자열, 리스트, 해시, 집합, 정렬된 집합 등 다양한 자료구조 지원
- TTL(Time To Live) 설정으로 자동 만료
- 단순 캐시부터 메시지 큐, 세션 저장소까지 다양하게 활용

### 이 프로젝트에서 Redis 활용
| 용도 | 설명 |
|------|------|
| BullMQ 백엔드 | 잡 데이터 저장·관리 |
| 질문 캐싱 | DB 부하 줄이기 (TTL 1시간) |
| JWT 블랙리스트 | 로그아웃된 토큰 무효화 |
| Rate Limiting | 유저별 요청 횟수 추적 |

---

## 3. ioredis — Redis 클라이언트

`ioredis`는 Node.js에서 Redis와 통신하는 라이브러리.

### src/lib/redis.ts

```typescript
import Redis from "ioredis";
import { env } from "../config/env";

const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,  // BullMQ 필수 옵션
});

export default redis;
```

**왜 싱글턴인가?**
- Redis 연결은 TCP 소켓을 사용함
- 요청마다 새 연결을 만들면 → 연결 과부하
- 하나의 연결 인스턴스를 앱 전체에서 재사용

**`maxRetriesPerRequest: null` 이 왜 필요한가?**
- BullMQ는 Redis 명령이 실패하면 무한 대기(blocking) 방식으로 재시도함
- 기본값(`maxRetriesPerRequest: 3`)이면 BullMQ가 중간에 에러를 던져버림
- `null`로 설정하면 BullMQ가 내부적으로 재시도 로직을 완전히 제어할 수 있음

---

## 4. BullMQ 핵심 개념

BullMQ = **Bull** (잡 큐 라이브러리) **MQ** (Message Queue)의 다음 버전

### 4.1 Queue (큐)

```typescript
import { Queue } from "bullmq";

const aiQueue = new Queue<AiJobData>("ai-evaluation", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,                              // 실패 시 최대 3번 재시도
    backoff: { type: "exponential", delay: 2000 },  // 재시도 간격: 2s, 4s, 8s
    removeOnComplete: { count: 500 },         // 완료된 잡 최대 500개 보관
    removeOnFail: { count: 200 },             // 실패한 잡 최대 200개 보관
  },
});
```

**Queue의 역할:** 잡을 추가(enqueue)하고, Redis에 잡 데이터를 저장

```typescript
// 잡 추가 → 즉시 jobId 반환
const job = await aiQueue.add("evaluate", {
  interviewQuestionId: "...",
  questionContent: "...",
  answerContent: "...",
});
// job.id → "1", "2", "3" ...
```

### 4.2 Worker (워커)

```typescript
import { Worker, Job } from "bullmq";

const worker = new Worker<AiJobData>(
  "ai-evaluation",      // 같은 큐 이름
  async (job) => {      // 잡 처리 함수
    // OpenAI 호출
    const result = await evaluateAnswer(...);
    // DB 저장
    await prisma.answer.upsert(...);
    return result;      // returnvalue에 저장됨
  },
  {
    connection: redis,
    concurrency: 5,     // 동시에 최대 5개 잡 처리
  }
);
```

**Worker의 역할:** Redis에서 잡을 꺼내어 처리함. Queue와 독립적으로 실행됨.

### 4.3 Job 상태 흐름

```
waiting → active → completed
    ↓           ↘
  delayed       failed → (재시도) → waiting
```

| 상태 | 의미 |
|------|------|
| `waiting` | 큐에 있음, 워커 대기 중 |
| `active` | 워커가 처리 중 |
| `completed` | 처리 완료, returnvalue에 결과 저장 |
| `failed` | 처리 실패 (재시도 소진 후) |
| `delayed` | 재시도 대기 중 (backoff 중) |

### 4.4 Exponential Backoff (지수 백오프)

재시도 간격이 지수적으로 늘어남:
- 1회 실패 → 2초 후 재시도
- 2회 실패 → 4초 후 재시도
- 3회 실패 → 8초 후 재시도 → 최종 실패

OpenAI 일시 장애처럼 "잠깐 기다리면 해결"되는 문제에 적합.

---

## 5. 아키텍처 변화 — 코드 레벨 비교

### Before: answer.controller.ts (동기)

```typescript
// 컨트롤러에서 직접 OpenAI 호출 → 2~5초 블로킹
const aiResult = await evaluateAnswer(questionContent, answerContent);
await prisma.answer.upsert(...);
res.json(answer);  // 처리 완료 후 응답
```

### After: answer.controller.ts (비동기)

```typescript
// 큐에 잡만 추가 → 즉시 응답
const job = await aiQueue.add("evaluate", {
  interviewQuestionId,
  questionContent,
  answerContent,
});
res.status(202).json({ jobId: job.id, status: "queued" });
```

**HTTP 202 Accepted** = "요청을 받았지만 아직 처리 완료는 아님"을 명시하는 표준 HTTP 상태 코드

### 상태 조회: GET /api/answers/status/:jobId

```typescript
const job = await aiQueue.getJob(jobId);
const state = await job.getState();  // "waiting" | "active" | "completed" | "failed"

if (state === "completed") {
  const answer = await prisma.answer.findUnique(...);
  return res.json({ jobId, status: state, answer });
}
```

---

## 6. Docker 구성

### Dockerfile (멀티스테이지 빌드)

```dockerfile
# 1단계: build — TypeScript 타입 체크
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci                    # npm install보다 더 엄격 (lock 파일 기준)
COPY . .
RUN npx tsc --noEmit          # TS 오류 검사

# 2단계: runtime — 실행에 필요한 것만
FROM node:18-alpine AS runtime
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev         # devDependencies 제외 (이미지 크기 감소)
COPY --from=build /app/src ./src
...
```

**왜 멀티스테이지인가?**
- build 단계의 TypeScript 컴파일러, 테스트 도구 등이 최종 이미지에 포함되지 않음
- 이미지 크기 대폭 감소 (보안 공격 표면 감소)

### docker-compose.yml 핵심

```yaml
services:
  app:
    depends_on:
      redis:
        condition: service_healthy  # Redis가 준비된 후에만 앱 시작
    environment:
      - REDIS_URL=redis://redis:6379  # 컨테이너 내부 네트워크 주소
  redis:
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]  # Redis가 응답할 때까지 대기
```

`redis://redis:6379` — Docker Compose 내부에서는 컨테이너 이름(`redis`)이 호스트네임이 됨

---

## 7. /health 엔드포인트

```typescript
app.get('/health', async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;   // DB 연결 확인
  const redisStatus = redis.status;   // "ready" | "connecting" | "close" 등
  res.json({ status: 'ok', db: 'connected', redis: 'connected' });
});
```

운영 환경에서 로드밸런서나 쿠버네티스가 이 엔드포인트를 주기적으로 호출해 서비스 상태를 확인함 (Health Check / Liveness Probe).

---

## 8. 전체 파일 구조 (추가된 것)

```
src/
├── config/
│   └── env.ts           ← REDIS_URL, OPENAI_API_KEY 추가
├── lib/
│   ├── prisma.ts        (기존)
│   └── redis.ts         ← ioredis 싱글턴 NEW
├── queues/
│   └── ai.queue.ts      ← BullMQ Queue 정의 NEW
├── workers/
│   └── ai.worker.ts     ← BullMQ Worker 구현 NEW
├── controllers/
│   └── answer.controller.ts  ← 동기→큐, getAnswerStatus 추가
├── routes/
│   └── answer.routes.ts      ← GET /status/:jobId 추가
└── index.ts             ← startAiWorker(), /health 추가
```

---

## 9. 검증 순서

```bash
# 1. Redis + 앱 실행
docker-compose up

# 2. 답변 제출 → jobId 즉시 반환 확인
curl -X POST http://localhost:3000/api/answers/submit \
  -H "Content-Type: application/json" \
  -d '{"interviewQuestionId":"...","content":"..."}'
# → { "jobId": "1", "status": "queued" }

# 3. 상태 폴링
curl http://localhost:3000/api/answers/status/1
# → { "status": "completed", "answer": { ... } }

# 4. 헬스 체크
curl http://localhost:3000/health
# → { "status": "ok", "db": "connected", "redis": "connected" }
```
