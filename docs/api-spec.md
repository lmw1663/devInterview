# API Specification

Swagger UI: `GET /api-docs` (OpenAPI 3.0.3 — `src/docs/openapi.ts`)

## Users `/api/users`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | no | 회원가입 |
| POST | `/login` | no | 로그인, JWT 반환 |
| POST | `/logout` | yes | 로그아웃 (토큰 블랙리스트 등록) |
| GET | `/profile` | yes | 내 프로필 조회 |

## Questions `/api/questions`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | no | 전체 질문 목록 (Redis 캐시, TTL 1시간) |
| GET | `/:id` | no | 단일 질문 조회 (Redis 캐시, TTL 1시간) |

## Interviews `/api/interviews`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/start` | yes | 인터뷰 세션 시작 (랜덤 질문 배정) |
| GET | `/result/:interviewId` | yes | 세션 결과 조회 |

## Answers `/api/answers`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/submit` | no | 단일 답변 제출 → **jobId 즉시 반환** (HTTP 202) |
| POST | `/submit-batch` | no | 배치 답변 제출 → **jobId 목록 반환** (HTTP 202/207) |
| GET | `/status/:jobId` | no | AI 평가 잡 상태 폴링 |

### POST /submit 응답 (변경됨)

이전: 동기 처리 후 `Answer` 객체 반환 (HTTP 200)  
현재: 큐 등록 후 즉시 반환 (HTTP 202)

```json
{ "jobId": "1", "status": "queued" }
```

### GET /status/:jobId 응답

| status | 의미 |
|--------|------|
| `waiting` | 큐 대기 중 |
| `active` | 워커 처리 중 |
| `completed` | 완료 — `answer` 필드 포함 |
| `failed` | 실패 — `error` 필드 포함 |

```json
{
  "jobId": "1",
  "status": "completed",
  "answer": { "aiScore": 85, "aiFeedback": "..." }
}
```

### POST /submit-batch 응답 (변경됨)

이전: Answer 배열  
현재: jobId 목록 (HTTP 202 전부 성공 / 207 일부 성공)

```json
{
  "results": [
    { "interviewQuestionId": "...", "ok": true, "jobId": "2" },
    { "interviewQuestionId": "...", "ok": false, "error": "InterviewQuestion not found" }
  ]
}
```

## 시스템 엔드포인트

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | no | DB·Redis 연결 상태 |
| GET | `/admin/queues` | no | Bull Board 큐 모니터링 UI |

### GET /health 응답

```json
{ "status": "ok", "db": "connected", "redis": "connected" }
```

## 공통 규칙

- 모든 응답은 JSON
- 인증 헤더: `Authorization: Bearer <token>`
- 오류 응답: `{ "error": "message" }`
- Rate Limit: `/api` 전체 분당 20회 (초과 시 `429 Too Many Requests`)
