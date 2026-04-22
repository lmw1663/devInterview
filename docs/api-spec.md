# API Specification

Swagger UI: `GET /api-docs` (OpenAPI 3.0.3 — `src/docs/openapi.ts`)

## Users `/api/users`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | no | 회원가입 |
| POST | `/login` | no | 로그인, JWT 반환 |
| GET | `/profile` | yes | 내 프로필 조회 |

## Questions `/api/questions`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | no | 전체 질문 목록 |
| GET | `/:id` | no | 단일 질문 조회 |

## Interviews `/api/interviews`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/start` | yes | 인터뷰 세션 시작 (랜덤 질문 배정) |
| GET | `/result/:interviewId` | yes | 세션 결과 조회 |

## Answers `/api/answers`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/submit` | no | 단일 답변 제출 |
| POST | `/submit-batch` | no | 배치 답변 제출 (HTTP 207 Multi-Status) |

## 공통 규칙

- 모든 응답은 JSON
- 인증 헤더: `Authorization: Bearer <token>`
- 오류 응답: `{ "error": "message" }`
