# Supabase 마이그레이션 작업 기록

## 배경

로컬 PostgreSQL(`localhost:5432/devinterview`)에서 Supabase(클라우드 PostgreSQL)로 DB를 이전했다.
Prisma v7 기반 프로젝트이며, 기존 데이터(User, Question 등)도 함께 이전했다.

---

## Supabase 프로젝트 정보

| 항목 | 값 |
|------|-----|
| Project Ref | `jdrfnrmihsolojaiiueu` |
| Region | ap-northeast-2 (서울) |
| Transaction Pooler (런타임용) | `aws-1-ap-northeast-2.pooler.supabase.com:6543` |
| Session Pooler (마이그레이션용) | `aws-1-ap-northeast-2.pooler.supabase.com:5432` |
| Direct Connection (차단됨) | `db.jdrfnrmihsolojaiiueu.supabase.co:5432` |

> Direct Connection(포트 5432)은 ISP/네트워크 방화벽으로 차단됨 → Session Pooler로 대체

---

## 수정된 파일

### 1. `prisma.config.ts`

Prisma v7에서는 `schema.prisma`에 `url`/`directUrl`을 쓰지 않는다.
CLI 도구(migrate, studio)의 연결 설정은 `prisma.config.ts`에서 관리한다.

```ts
datasource: {
  url: process.env["DIRECT_URL"],  // Session Pooler (마이그레이션용)
}
```

### 2. `prisma/schema.prisma`

Prisma v7에서 `datasource` 블록에 `url`/`directUrl` 필드를 쓰면 오류가 난다.
provider만 명시한다.

```prisma
datasource db {
  provider = "postgresql"
}
```

### 3. `.env`

```env
# Supabase Transaction Pooler (앱 런타임 쿼리용)
DATABASE_URL="postgresql://postgres.jdrfnrmihsolojaiiueu:[PASSWORD]@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# Supabase Session Pooler (Prisma 마이그레이션 전용)
DIRECT_URL="postgresql://postgres.jdrfnrmihsolojaiiueu:[PASSWORD]@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres"
```

> **주의:** 비밀번호에 특수문자(`@`, `!` 등)가 있으면 URL 인코딩 필요.
> `@` → `%40`, `!` → `!`(그대로), `#` → `%23`
> 예: 비밀번호 `abc@123` → URL에서 `abc%40123`

---

## 연결 구조 (Prisma v7 + Supabase)

```
Prisma CLI (migrate/studio)
  └─ prisma.config.ts → DIRECT_URL (Session Pooler :5432)
       └─ 스키마 생성, 마이그레이션 실행

앱 런타임 (PrismaClient)
  └─ src/lib/prisma.ts → DATABASE_URL (Transaction Pooler :6543)
       └─ 일반 CRUD 쿼리
```

---

## 마이그레이션 절차 (실행 순서)

```bash
# 1. PostgreSQL 클라이언트 설치 (pg_dump, psql용)
brew install postgresql

# PATH 등록 (zshrc에 추가)
echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# 2. Supabase에 스키마 적용 (5개 마이그레이션)
npx prisma migrate deploy

# 3. 로컬 DB 데이터만 덤프 (스키마 제외, prisma 메타테이블 제외)
export PATH="/opt/homebrew/opt/postgresql@18/bin:$PATH"  # 서버 버전과 동일한 pg_dump 사용
pg_dump -U postgres -h localhost -d devinterview \
  --data-only --no-owner --no-acl \
  --exclude-table='_prisma_migrations' \
  -f data.sql

# 4. Supabase로 데이터 복원
PGPASSWORD='[실제비밀번호]' psql \
  -U "postgres.jdrfnrmihsolojaiiueu" \
  -h "aws-1-ap-northeast-2.pooler.supabase.com" \
  -p 5432 -d postgres \
  -f data.sql

# 5. Prisma 클라이언트 재생성
npx prisma generate

# 6. 작업 후 덤프 파일 삭제 (보안)
rm data.sql
```

---

## 이전된 데이터

| 테이블 | 건수 |
|--------|------|
| User | 2 |
| InterviewSession | 5 |
| Question | 50 |
| InterviewQuestion | 19 |
| Answer | 2 |

---

## 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| `P1001: Can't reach database server` (direct :5432) | ISP 방화벽 | Session Pooler (:5432 on pooler host)로 대체 |
| `Authentication failed` | URL에 `@` 포함 비밀번호 → 파싱 오류 | `@`를 `%40`으로 URL 인코딩 |
| `pg_dump: server version mismatch` | Homebrew pg_dump v16, 로컬 서버 v18 | `postgresql@18` 경로의 pg_dump 사용 |
| Prisma v7 `url` 필드 오류 | v7에서 schema.prisma에 url 불가 | `prisma.config.ts`로 이동 |
| 서버 응답 실패 (포트 충돌) | 기존 프로세스가 :3000 점유 | `lsof -ti:3000 \| xargs kill -9` 후 재시작 |

---

## 개발 서버 실행

```bash
# 기존 프로세스 정리 후 실행
lsof -ti:3000 | xargs kill -9 2>/dev/null; npm run dev
```
