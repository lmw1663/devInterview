# 보안 강화 & Redis 활용 확장 학습 정리

## 1. Helmet — HTTP 보안 헤더

```typescript
import helmet from 'helmet';
app.use(helmet());
```

Helmet은 Express의 `res.setHeader()` 호출을 모아놓은 미들웨어 모음이다.  
설치만 해도 아래 HTTP 헤더들이 자동으로 설정됨:

| 헤더 | 방어하는 공격 |
|------|------|
| `Content-Security-Policy` | XSS (스크립트 인젝션) |
| `X-Frame-Options: DENY` | 클릭재킹 |
| `X-Content-Type-Options: nosniff` | MIME 타입 스니핑 |
| `Strict-Transport-Security` | HTTP 다운그레이드 공격 |
| `Referrer-Policy` | 개인정보 유출 |

**핵심 포인트:** 한 줄로 10가지 이상의 보안 헤더를 적용한다.  
운영 서버에서는 CSP 정책을 별도로 커스터마이징하는 것이 일반적.

---

## 2. CORS 환경변수 분리

```typescript
// 기존: 모든 출처 허용 (위험)
app.use(cors());

// 개선: 환경변수로 허용 출처 제어
app.use(cors({ origin: env.CORS_ORIGIN }));
```

**왜 환경변수로 분리하는가?**
- 개발 환경: `CORS_ORIGIN=*` (편의)
- 스테이징: `CORS_ORIGIN=https://staging.myapp.com`
- 프로덕션: `CORS_ORIGIN=https://myapp.com`

코드를 바꾸지 않고 배포 환경별로 보안 정책을 다르게 적용 가능.

---

## 3. Rate Limiting — 요청 횟수 제한

```typescript
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';

const limiter = rateLimit({
  windowMs: 60 * 1000,  // 1분 윈도우
  max: 20,              // 분당 최대 20회
  store: new RedisStore({
    sendCommand: (command, ...args) => redis.call(command, ...args),
  }),
});

app.use('/api', limiter);
```

### 메모리 스토어 vs Redis 스토어 비교

| 구분 | 메모리 스토어 (기본) | Redis 스토어 |
|------|------|------|
| 서버 재시작 | 카운터 초기화됨 | 유지됨 |
| 멀티 인스턴스 | 인스턴스별로 따로 카운트 | 공유됨 |
| 분산 환경 | 우회 가능 | 정확히 제한 |

**Redis 스토어를 써야 하는 이유:** 서버가 2개 이상 실행될 때(클러스터, 로드밸런싱) 메모리 스토어는 각각 20번씩 허용하므로 실제로 40번이 되어버림.

### Rate Limit 응답

제한 초과 시 자동으로 `429 Too Many Requests` 응답:
```json
{ "message": "Too many requests, please try again later." }
```

헤더에도 정보 포함:
```
RateLimit-Limit: 20
RateLimit-Remaining: 0
RateLimit-Reset: (epoch timestamp)
```

---

## 4. Redis Cache-Aside 패턴 — 질문 목록 캐싱

```typescript
export const getAllQuestions = async () => {
  const cacheKey = "questions:all";

  // 1. Redis 먼저 확인
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);   // 캐시 히트 → DB 쿼리 없음

  // 2. 캐시 미스 → DB 조회
  const questions = await prisma.question.findMany();

  // 3. Redis에 저장 (TTL 1시간)
  await redis.setex(cacheKey, 3600, JSON.stringify(questions));

  return questions;
};
```

### Cache-Aside (Lazy Loading) 패턴이란?

```
요청 → 캐시 확인
         ├─ 히트 → 캐시 데이터 반환 (빠름)
         └─ 미스 → DB 조회 → 캐시 저장 → 반환
```

**장점:**
- DB 읽기 부하 대폭 감소 (동일 데이터 반복 조회 시)
- 자주 읽는 데이터에 효과적

**주의사항 — Cache Invalidation:**
- 질문이 추가/수정/삭제되면 캐시가 stale(오래된 상태)이 됨
- 해결책: 쓰기 시 `redis.del("questions:all")`로 캐시 무효화
- 또는 TTL을 짧게 설정 (허용 가능한 지연만큼)

**Redis 키 명명 규칙:**
- `questions:all` — 전체 목록
- `questions:{id}` — 개별 항목
- `blacklist:{token}` — JWT 블랙리스트

---

## 5. JWT 블랙리스트 — 로그아웃 토큰 무효화

### 문제: JWT는 상태가 없다 (Stateless)

JWT는 서버가 별도 저장소 없이 토큰의 유효성을 검증할 수 있어 확장성이 좋다.  
그러나 이 특성 때문에 **로그아웃 시 토큰을 즉시 무효화하기 어렵다.**

토큰이 7일 만료라면, 로그아웃해도 7일 동안 토큰은 유효하게 남아있음.

### 해결: Redis 블랙리스트

```typescript
// 로그아웃 시: 토큰을 블랙리스트에 저장
export const blacklistToken = async (token: string) => {
  const decoded = verifyToken(token) as { exp?: number };
  const now = Math.floor(Date.now() / 1000);
  const ttl = decoded.exp ? decoded.exp - now : 60 * 60 * 24 * 7;  // 남은 유효시간만큼 TTL
  if (ttl > 0) await redis.setex(`blacklist:${token}`, ttl, "1");
};

// 인증 미들웨어에서: 블랙리스트 확인
const isBlacklisted = await redis.exists(`blacklist:${token}`);
if (isBlacklisted) return res.status(401).json({ error: "Token has been revoked" });
```

**TTL을 남은 만료 시간으로 설정하는 이유:**  
- 토큰이 만료되면 어차피 유효하지 않음
- 블랙리스트 데이터도 같이 자동 삭제 → Redis 메모리 낭비 없음

### 로그아웃 API

```
POST /api/users/logout
Authorization: Bearer <token>
→ 200 { "message": "Logged out successfully" }
```

이후 같은 토큰으로 요청하면 `401 Token has been revoked`.

---

## 6. pino 로거 — 구조화 JSON 로그

```typescript
// src/lib/logger.ts
const logger = pino({
  level: "info",
  transport: process.env.NODE_ENV !== "production"
    ? { target: "pino-pretty", options: { colorize: true } }  // 개발: 가독성 좋게
    : undefined,  // 프로덕션: 순수 JSON
});
```

### 일반 console.log vs pino 비교

```
// console.log
[ai-worker] job 1 failed: API error

// pino (JSON 구조화)
{"level":50,"time":1714123456789,"jobId":"1","err":"API error","msg":"ai-worker: job failed"}
```

**구조화 로그의 장점:**
- Datadog, Grafana, CloudWatch 같은 로그 수집 도구가 JSON 파싱 가능
- 특정 jobId, userId, 에러 메시지로 필터링 가능
- `level` 숫자: 10=trace, 20=debug, 30=info, 40=warn, 50=error, 60=fatal

### pino-http — HTTP 요청 자동 로깅

```typescript
app.use(pinoHttp({ logger }));
```

모든 HTTP 요청/응답이 자동으로 로깅됨:
```json
{"method":"POST","url":"/api/answers/submit","statusCode":202,"responseTime":12}
```

---

## 7. Bull Board — 큐 시각화 UI

```typescript
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(aiQueue)],
  serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());
```

`GET http://localhost:3000/admin/queues` 에 접속하면 웹 UI로 확인 가능:
- 대기 중인 잡 수
- 처리 완료/실패 잡 목록
- 실패 잡의 스택 트레이스
- 수동 재시도 버튼

**운영 환경에서는 반드시 인증 미들웨어 추가 필요:**
```typescript
app.use('/admin/queues', adminAuthMiddleware, serverAdapter.getRouter());
```

---

## 8. 전체 미들웨어 스택 (적용 순서)

```
요청 들어옴
  ↓
helmet()          — 보안 헤더 설정
  ↓
cors()            — CORS 허용 여부 결정
  ↓
express.json()    — 바디 파싱
  ↓
pinoHttp()        — 요청 로깅 시작
  ↓
rateLimit()       — 분당 20회 제한 (Redis 기반)
  ↓
authMiddleware()  — JWT 검증 + 블랙리스트 확인
  ↓
라우트 핸들러
  ↓
응답
```

**미들웨어 순서가 중요한 이유:**  
- `helmet`을 첫 번째로 → 모든 응답에 보안 헤더 보장
- `pinoHttp`를 rate limit 전에 → 차단된 요청도 로깅
- `authMiddleware`를 rate limit 후에 → 과부하 방지 먼저

---

## 9. 새로 추가된 엔드포인트 정리

| 메서드 | 경로 | 설명 |
|------|------|------|
| POST | `/api/users/logout` | JWT 블랙리스트 등록 후 로그아웃 |
| GET | `/health` | DB + Redis 연결 상태 반환 |
| GET | `/admin/queues` | Bull Board 큐 모니터링 UI |
| GET | `/api/answers/status/:jobId` | AI 평가 잡 상태 폴링 |
