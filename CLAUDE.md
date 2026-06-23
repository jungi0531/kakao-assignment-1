# Project Rules — kakao-assignment-3

## 프로젝트 개요

`kakao-assignment-2`의 React(Vite) + 로컬스토리지 기반 Todo 앱을 Next.js App Router + FastAPI 풀스택으로 마이그레이션하는 프로젝트.
참고 소스: `../kakao-assignment-2/src/`

---

## 기술 스택 (고정)

| 항목 | 버전 |
|------|------|
| Next.js | v16 (App Router) |
| React | v19 |
| TypeScript | v5 |
| Tailwind CSS | v4 |
| FastAPI | v0.111+ |
| Uvicorn | v0.29+ |
| SQLAlchemy | v2 |
| Pydantic | v2 |
| DB | SQLite |

---

## 디렉토리 구조

```
kakao-assignment-3/
├── frontend/
│   ├── app/
│   │   ├── api/todos/
│   │   │   └── route.ts        # HTTP 프록시 — 클라이언트 요청을 FastAPI로 중계
│   │   ├── todos/
│   │   │   ├── [todoId]/
│   │   │   │   └── page.tsx    # Todo 수정 페이지
│   │   │   ├── new/
│   │   │   │   └── page.tsx    # Todo 생성 페이지
│   │   │   ├── error.tsx       # 에러 발생 시 보여줄 화면
│   │   │   ├── loading.tsx     # 데이터 로딩 중 보여줄 화면
│   │   │   └── page.tsx        # Todo 목록 페이지
│   │   ├── actions.ts          # Server Actions — 서버에서 직접 FastAPI 호출
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx            # 루트 페이지 (/ → /todos 리다이렉트)
│   └── .env.local
│
└── backend/
    ├── main.py                 # FastAPI 앱 — 라우터, DB, 모델, 스키마 전부
    ├── requirements.txt
    └── .env.local
```

---

## 핵심 개념

### Server Component vs Client Component

Next.js App Router에서 컴포넌트는 기본적으로 **Server Component**예요.

| | Server Component | Client Component |
|--|--|--|
| 기본값 | ✅ (선언 없이 사용) | `"use client"` 선언 필요 |
| 실행 위치 | 서버 | 브라우저 |
| 데이터 패칭 | 직접 가능 (async/await) | useEffect 필요 |
| 상태·이벤트 | ❌ 사용 불가 | ✅ useState, onClick 등 사용 가능 |
| 언제 쓰나 | 데이터 조회, 레이아웃 | 버튼 클릭, 입력 폼, 상태 관리 |

### route.ts vs actions.ts

둘 다 서버에서 실행되지만 호출 방식이 달라요.

| | route.ts | actions.ts |
|--|--|--|
| 역할 | HTTP 엔드포인트 (외부 요청 수신) | 서버 함수 (컴포넌트에서 직접 호출) |
| 호출 방식 | `fetch('/api/todos')` | `import { getTodos } from '@/app/actions'` |
| 주로 쓰는 곳 | Client Component에서 CRUD 요청 | Server Component에서 데이터 조회 |

```
[Server Component]  →  actions.ts  →  FastAPI
[Client Component]  →  /api/route.ts  →  FastAPI
```

### App Router 파일 컨벤션

| 파일명 | 역할 |
|--------|------|
| `page.tsx` | 해당 URL의 UI |
| `layout.tsx` | 여러 페이지를 감싸는 공통 레이아웃 |
| `loading.tsx` | 페이지 로딩 중 자동으로 보여줄 화면 |
| `error.tsx` | 에러 발생 시 자동으로 보여줄 화면 |
| `route.ts` | API 엔드포인트 (GET, POST 등 HTTP 메서드 함수로 정의) |

---

## 디자인 토큰 (2차 과제에서 그대로 유지)

```css
--color-primary:        #672be0
--color-primary-hover:  #7f47e8
--color-primary-active: #5120c4
--color-primary-bg:     #f0ebfd
--color-surface:        #ffffff
--color-background:     #f4f4f6
--color-border:         #e5e5ea
--color-text:           #1a1a1a
--color-text-secondary: #6e6e73
--color-text-muted:     #aeaeb2
--color-danger:         #ff3b30
--color-danger-bg:      #fff0ef
```

---

## 코드 작성 규칙

- **언어**: TypeScript 사용, 모든 함수에 타입 명시
- **변수명·함수명**: 역할이 바로 드러나도록 명확하게 작성 (`handleAddTodo`, `fetchTodos` 등)
- **주석**: 개념 이해에 필요한 곳엔 적극적으로 추가
  - Next.js 특유의 동작 (Server Component, 캐싱, 리다이렉트 등)
  - `"use client"` 선언이 필요한 이유
  - `route.ts`와 `actions.ts`의 역할 구분
  - 처음 보면 생소할 수 있는 FastAPI 패턴
- **불변성**: 상태는 항상 새 객체/배열로 교체, 직접 수정 금지
- **파일 크기**: 파일당 200–400줄 유지, 800줄 초과 금지

---

## 응답 형식 규칙

- 기능을 구현하기 전 → **무엇을 왜 만드는지 한 줄 설명** 후 진행
- 새로운 개념이 등장하면 → **짧게 개념 설명** 후 코드 작성
- 코드 작성 시 → **변경된 파일의 전체 코드를 파일별로** 보여줄 것
- 작업 완료 후 → **구현한 기능을 체크리스트로** 정리해서 답변할 것
- **한 번에 한 단계씩** 진행하고, 다음 단계로 넘어가기 전에 확인 요청할 것
