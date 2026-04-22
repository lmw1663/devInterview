# Database Schema

ORM: Prisma / DB: PostgreSQL (Supabase)  
스키마 파일: `prisma/schema.prisma`

## 모델 관계

```
User → InterviewSession → InterviewQuestion ←→ Question
                                   ↓
                                Answer (1:1)
```

## 모델 상세

### User
| 필드 | 타입 | 설명 |
|------|------|------|
| id | String (uuid) | PK |
| email | String (unique) | 이메일 |
| password | String | bcrypt 해시 |
| createdAt | DateTime | 생성일 |

### InterviewSession
| 필드 | 타입 | 설명 |
|------|------|------|
| id | String (uuid) | PK |
| userId | String | FK → User |
| category | String | 인터뷰 카테고리 |
| questionCount | Int | 질문 수 |
| createdAt | DateTime | 생성일 |

### InterviewQuestion (pivot table)
| 필드 | 타입 | 설명 |
|------|------|------|
| id | String (uuid) | PK |
| interviewId | String | FK → InterviewSession |
| questionId | String | FK → Question |
| order | Int | 질문 순서 |

**유니크 제약:**
- `(interviewId, order)` — 세션 내 순서 중복 방지
- `(interviewId, questionId)` — 세션 내 질문 중복 방지

### Question
| 필드 | 타입 | 설명 |
|------|------|------|
| id | String (uuid) | PK |
| category | String | 카테고리 |
| content | String | 질문 내용 |
| createdAt | DateTime | 생성일 |

### Answer
| 필드 | 타입 | 설명 |
|------|------|------|
| id | String (uuid) | PK |
| interviewQuestionId | String (unique) | FK → InterviewQuestion (1:1) |
| content | String | 답변 텍스트 |
| audioURI | String? | 음성 파일 URI (선택) |
| duration | Int? | 답변 시간(초, 선택) |
| aiScore | Int? | AI 점수 0–100 (비동기 채점) |
| aiFeedback | String? | AI 피드백 (비동기 채점) |
| createdAt | DateTime | 생성일 |

## 마이그레이션 명령

```bash
npx prisma migrate dev    # 마이그레이션 생성 및 적용
npx prisma generate       # Prisma 클라이언트 재생성
npx prisma studio         # GUI로 DB 확인
```
