# Authentication Design

## 방식

JWT Bearer Token, 만료 7일

## 흐름

```
POST /api/users/login
  → 이메일/비밀번호 검증 (bcrypt)
  → JWT 발급 { userId, email }
  → 클라이언트가 헤더에 포함: Authorization: Bearer <token>
  → authMiddleware가 검증 후 req.user에 payload 첨부
```

## 미들웨어

파일: `src/middlewares/auth.middleware.ts`

- `authMiddleware` — 토큰 검증, 실패 시 401 반환
- 검증 성공 시 `req.user` 사용 가능 (Express module augmentation으로 타입 선언됨)

## 라우트 보호

```typescript
router.get("/protected", authMiddleware, controller);
```

## 유틸

- `src/utils/jwt.ts` — `generateToken()`, `verifyToken()`
- `src/utils/hash.ts` — bcrypt `hashPassword()`, `comparePassword()`

## 환경 변수

- `JWT_SECRET` — 서명 키 (`src/config/env.ts`에서 import)
