# Redis + Docker + GPT Queue 구현 계획

## Context

현재 /api/answers/submit, /api/answers/submit-batch 에서 OpenAI API를 동기적으로 직접 호출한다.
트래픽이 몰리면 OpenAI rate limit 초과, 타임아웃, 서버 과부하가 발생한다.
Redis + BullMQ로 GPT 요청을 큐에 쌓고, 워커가 순서대로 처리하도록 분리한다.
Docker로 앱·Redis를 컨테이너화해 환경 일관성을 확보한다.

---

## ✅ 완료

### 🐳 Docker 설정
- [x] `Dockerfile` — Node.js 18 alpine, 멀티스테이지 빌드
- [x] `docker-compose.yml` — app / redis 서비스 정의
- [x] `.dockerignore` — node_modules, .env, dist 제외
- [x] `.env.example` — 필수 환경변수 템플릿

### 🔴 Redis 설정
- [x] `ioredis` 패키지 설치
- [x] `src/lib/redis.ts` — 싱글턴 (REDIS_URL, maxRetriesPerRequest: null)
- [x] `src/config/env.ts` — REDIS_URL, OPENAI_API_KEY, CORS_ORIGIN, NODE_ENV 추가

### 📬 GPT 요청 큐 (BullMQ)
- [x] `bullmq` 패키지 설치
- [x] `src/queues/ai.queue.ts` — AI 평가 큐 (attempts: 3, exponential backoff)
- [x] `src/workers/ai.worker.ts` — 워커 (OpenAI → DB), concurrency 5, pino 로깅
- [x] `src/controllers/answer.controller.ts` — 동기 OpenAI → 큐 enqueue, getAnswerStatus
- [x] `src/routes/answer.routes.ts` — GET /status/:jobId

### 🗄️ Redis 추가 활용
- [x] **질문 목록 캐싱** — `question.service.ts` cache-aside (TTL 1시간)
- [x] **JWT 블랙리스트** — 로그아웃 시 토큰 Redis 저장, auth middleware 검증
- [x] **Rate Limiting** — `express-rate-limit` + `rate-limit-redis`, 분당 20회

### 🔒 보안 강화
- [x] Helmet 미들웨어
- [x] CORS origin 환경변수 분리
- [x] POST /api/users/logout 엔드포인트

### 📊 모니터링 & 로깅
- [x] `pino` + `pino-http` 로거 — 구조화 JSON 로그
- [x] 큐 이벤트 로깅 (완료/실패)
- [x] `/health` 엔드포인트 — DB·Redis 연결 상태
- [x] Bull Board (`@bull-board/express`) — GET /admin/queues

---

## 🕐 나중에 추가해도 될것들

- [ ] **Bull Board 어드민 인증** — `/admin/queues` 앞에 인증 미들웨어 추가
- [ ] **SSE** — `GET /api/answers/stream/:jobId` 큐 처리 완료 실시간 푸시
- [ ] **오디오 처리 (Whisper)** — `audio.queue.ts`, `audio.worker.ts`, `POST /api/answers/submit-audio`
- [ ] **테스트** — `docker-compose.test.yml`, 큐 워커 단위 테스트 (vitest)
- [ ] **Cache Invalidation** — 질문 추가/수정/삭제 시 Redis 캐시 무효화

---

## 현재 아키텍처

```
Client → POST /submit → BullMQ Queue (Redis)
                              ↓
                        ai.worker → ai.service (OpenAI) → DB
                              ↓
               Client → GET /status/:jobId → 결과 폴링
```

## 학습 문서

| 파일 | 내용 |
|------|------|
| `docs/study-async-queue.md` | Redis, BullMQ, Docker, 비동기 큐 패턴 |
| `docs/study-security-redis.md` | Helmet, CORS, Rate Limiting, JWT 블랙리스트, pino, Bull Board |
