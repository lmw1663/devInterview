# CLAUDE.md

## Commands

```bash
npm run dev              # 개발 서버 실행 (hot-reload)
npx prisma migrate dev   # 마이그레이션 생성 및 적용
npx prisma studio        # DB GUI
npx prisma generate      # Prisma 클라이언트 재생성
```

테스트 러너 미설정 (`npm test` placeholder).

## Docs

세부 사항은 `docs/` 참조:

| 파일 | 내용 |
|------|------|
| [`docs/api-spec.md`](docs/api-spec.md) | 전체 엔드포인트 목록 |
| [`docs/db-schema.md`](docs/db-schema.md) | Prisma 모델, 관계, 마이그레이션 |
| [`docs/auth.md`](docs/auth.md) | JWT 인증 흐름 및 미들웨어 |
| [`docs/conventions.md`](docs/conventions.md) | 레이어 규칙, 코딩 컨벤션 |
| [`docs/architecture.md`](docs/architecture.md) | 요청 흐름·레이어·DB 모델 Mermaid 다이어그램 |

Swagger UI: `GET /api-docs` (로컬 서버 실행 후)

## Architecture

Express + TypeScript 기술 면접 연습 플랫폼.  
요청 흐름·레이어 구조·DB 모델 관계 다이어그램 → [`docs/architecture.md`](docs/architecture.md)

**핵심 규칙:**
- Prisma 클라이언트는 `src/lib/prisma.ts` 싱글턴만 사용
- 환경변수는 `src/config/env.ts`에서만 import
- DB 쿼리는 `services/`에서만

