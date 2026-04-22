# Coding Conventions

## 레이어 규칙

| 레이어 | 역할 | 규칙 |
|--------|------|------|
| `routes/` | 엔드포인트 정의, 미들웨어 연결 | 로직 없음 |
| `controllers/` | req 파싱 → service 호출 → res 반환 | DB 직접 접근 금지 |
| `services/` | 비즈니스 로직, DB 쿼리 | HTTP 객체(req/res) 사용 금지 |
| `middlewares/` | 인증 등 공통 처리 | |

## Prisma 클라이언트

`src/lib/prisma.ts`의 싱글턴만 사용. 직접 `new PrismaClient()` 생성 금지.

```typescript
import prisma from "../lib/prisma";
```

## 환경 변수

`src/config/env.ts`에서만 import. `process.env` 직접 참조 금지.

```typescript
import { PORT, JWT_SECRET, DATABASE_URL } from "../config/env";
```

## AI 채점

`src/services/ai.service.ts` 사용:
- 단건: `evaluateAnswer(question, answer)`
- 배치: `evaluateAnswersBatch(pairs[])` — 단일 OpenAI 호출로 여러 쌍 처리

## 커밋 메시지

- 한국어, 1줄, "왜"에 초점
- `/커밋푸시` 또는 "커밋푸시" 입력 시 Claude가 자동 처리
- 민감 파일(`.env*`, `*.key`, `*.pem`, `.DS_Store`) 제외

## 타입

- Express `req.user` 타입은 `auth.middleware.ts`에 module augmentation으로 선언됨
- 새 모델 추가 후 반드시 `npx prisma generate` 실행
