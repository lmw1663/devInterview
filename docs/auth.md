# Authentication Design

## 방식

JWT Bearer Token, 만료 7일

## 로그인 흐름

```
POST /api/users/login
  → 이메일/비밀번호 검증 (bcrypt)
  → JWT 발급 { userId }
  → 클라이언트가 헤더에 포함: Authorization: Bearer <token>
  → authMiddleware가 검증 후 req.user에 payload 첨부
```

## 로그아웃 흐름 (JWT 블랙리스트)

JWT는 Stateless 구조라 서버가 발급한 토큰을 즉시 무효화하기 어렵다.  
Redis 블랙리스트를 사용해 로그아웃된 토큰을 무효화한다.

```
POST /api/users/logout   (Authorization: Bearer <token> 필요)
  → blacklistToken(token) 호출
  → Redis에 blacklist:{token} = "1" 저장
  → TTL = 토큰 남은 만료 시간 (만료 후 자동 삭제)
  → 이후 같은 토큰 → 401 "Token has been revoked"
```

**TTL을 남은 만료 시간으로 설정하는 이유:**  
만료된 토큰은 어차피 서명 검증에서 실패하므로 블랙리스트에 영구 보관할 필요가 없다. Redis 메모리를 절약하면서 자동 정리가 이루어진다.

## authMiddleware 처리 순서

파일: `src/middlewares/auth.middleware.ts`

```
1. Authorization 헤더 확인 → 없으면 401
2. Bearer 토큰 추출 → 형식 오류 시 401
3. redis.exists("blacklist:{token}") → 블랙리스트 확인 → 있으면 401 "Token has been revoked"
4. verifyToken(token) → JWT 서명/만료 검증 → 실패 시 401 "Invalid token"
5. req.user = decoded → 다음 미들웨어/컨트롤러에서 사용 가능
```

**주의:** `authMiddleware`는 Redis 호출로 인해 `async`다.

## 라우트 보호

```typescript
router.post("/logout", authMiddleware, logoutUser);
router.get("/profile", authMiddleware, getProfile);
```

## 유틸

- `src/utils/jwt.ts` — `generateToken(userId)`, `verifyToken(token)`
- `src/middlewares/auth.middleware.ts` — `authMiddleware`, `blacklistToken(token)`

## 환경 변수

- `JWT_SECRET` — 서명 키 (`src/config/env.ts`에서 import)

## Redis 키 패턴

| 키 | TTL | 값 |
|------|------|------|
| `blacklist:{token}` | 토큰 남은 만료 시간 | `"1"` |
