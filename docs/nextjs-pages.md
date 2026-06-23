# Goal: Next.js Todo 페이지 구현

## 목표 개요

2차 과제의 단일 `App.jsx`를 Next.js App Router 기반의 파일 구조로 분리한다.
각 URL이 하나의 `page.tsx` 파일에 대응되며, 인터랙션이 필요한 부분만 Client Component로 선언한다.
이 단계에서는 페이지 구조와 컴포넌트 분리에 집중하고, 실제 API 연동은 Step 5에서 진행한다.

---

## 이번 단계 범위

**포함**
- 페이지 파일 생성 (`todos/page.tsx`, `todos/new/page.tsx`, `todos/[todoId]/page.tsx`)
- `error.tsx`, `loading.tsx` 구현
- 2차 과제 컴포넌트를 Next.js 구조로 재작성 (Server/Client 분리)
- 루트 페이지(`/`)를 `/todos`로 리다이렉트
- 타입 정의 (`Todo` 인터페이스)

**제외**
- 실제 API 연동 (actions.ts, route.ts — Step 5에서 진행)
- 환경변수 설정 (Step 6에서 진행)
- 주간 뷰 날짜별 Todo 개수 (API 연동 후 처리)

---

## 2차 과제와의 핵심 차이

| 항목 | 2차 과제 (React + Vite) | 3차 과제 (Next.js App Router) |
|------|------------------------|------------------------------|
| 진입점 | `App.jsx` 하나에 모든 상태와 UI | `todos/page.tsx`가 목록, `new/page.tsx`가 생성 |
| 렌더링 | 전부 클라이언트 렌더링 | 기본 Server Component, 인터랙션만 Client |
| 라우팅 | URL 없음 (단일 페이지) | 파일 경로 자체가 URL |
| 데이터 | `useState` + localStorage | Server Component에서 API 직접 조회 |
| 상태 관리 | `useState`로 todos 배열 보관 | 서버가 원본, 조작 후 페이지 재검증 |

---

## 파일 구조

```
frontend/
├── app/
│   ├── todos/
│   │   ├── [todoId]/
│   │   │   └── page.tsx       # Todo 수정 페이지 (Client Component)
│   │   ├── new/
│   │   │   └── page.tsx       # Todo 생성 페이지 (Client Component)
│   │   ├── error.tsx          # 에러 화면 (Client Component — Next.js 필수)
│   │   ├── loading.tsx        # 로딩 화면 (Server Component)
│   │   └── page.tsx           # Todo 목록 페이지 (Server Component)
│   ├── globals.css
│   ├── layout.tsx             # 공통 레이아웃 (Server Component)
│   └── page.tsx               # 루트 → /todos 리다이렉트
├── components/
│   ├── WeekNavigator.tsx      # 주간 날짜 네비게이터 (Client Component)
│   ├── TodoInput.tsx          # Todo 입력창 (Client Component)
│   ├── TodoFilter.tsx         # 필터 탭 (Client Component)
│   ├── TodoList.tsx           # Todo 목록 (Server Component)
│   └── TodoItem.tsx           # Todo 개별 항목 (Client Component)
└── types/
    └── todo.ts                # 공유 타입 정의 (Todo 인터페이스)
```

---

## Server / Client Component 분류

| 파일 | 분류 | 이유 |
|------|------|------|
| `todos/page.tsx` | Server | API 데이터 조회 (async/await), 인터랙션 없음 |
| `todos/new/page.tsx` | Client | 입력 폼 (onChange, onSubmit) |
| `todos/[todoId]/page.tsx` | Client | 입력 폼 + 초기값 로드 |
| `todos/error.tsx` | Client | Next.js 필수 요구사항 |
| `todos/loading.tsx` | Server | 단순 스켈레톤 UI, 인터랙션 없음 |
| `components/WeekNavigator.tsx` | Client | 날짜 선택, 이전/다음 주 버튼 클릭 |
| `components/TodoInput.tsx` | Client | 텍스트 입력, 추가 버튼 클릭 |
| `components/TodoFilter.tsx` | Client | 필터 탭 클릭 |
| `components/TodoList.tsx` | Server | 단순 렌더링, TodoItem에 props 전달 |
| `components/TodoItem.tsx` | Client | 완료 토글, 인라인 편집, 삭제 버튼 |

---

## 컴포넌트 설계

### 데이터 흐름

```
todos/page.tsx (Server)
  ├── actions.ts로 FastAPI 호출 → todos 배열 수신 (Step 5)
  ├── WeekNavigator (Client) ← 날짜 선택 시 URL 파라미터 변경
  ├── TodoInput (Client) ← 생성 → /todos/new 이동 또는 Server Action 호출
  ├── TodoFilter (Client) ← 필터 선택 시 URL 파라미터 변경
  └── TodoList (Server)
        └── TodoItem (Client) × N ← 토글/수정/삭제
```

### 2차 과제 컴포넌트 매핑

| 2차 과제 | 3차 과제 | 변경 사항 |
|---------|---------|---------|
| `App.jsx` (상태 관리) | `todos/page.tsx` | 상태 제거, Server Component로 전환 |
| `WeekNavigator.jsx` | `WeekNavigator.tsx` | `selectedDate` state → URL 파라미터 |
| `TodoInput.jsx` | `TodoInput.tsx` | `onAddTodo` prop → Server Action 호출 |
| `TodoFilter.jsx` | `TodoFilter.tsx` | `filter` state → URL 파라미터 |
| `TodoList.jsx` | `TodoList.tsx` | Server Component로 전환 (단순 렌더링) |
| `TodoItem.jsx` | `TodoItem.tsx` | 토글/수정/삭제 → Server Action 호출 |

### 타입 정의

```typescript
// frontend/types/todo.ts — 여러 컴포넌트에서 공유하므로 단일 파일로 관리
export interface Todo {
  id: number
  title: string
  completed: boolean
  date: string  // "YYYY-MM-DD"
}
```

---

## 페이지별 구현 명세

### `app/todos/page.tsx` (Server Component)
- `date` 쿼리 파라미터로 선택된 날짜 파악
- actions.ts 통해 FastAPI에서 todos 조회 (Step 5 연동)
- WeekNavigator, TodoInput, TodoFilter, TodoList 렌더링
- 이 단계에서는 빈 배열 또는 placeholder 데이터로 UI 구조 확인

### `app/todos/new/page.tsx` (Client Component)
- 제목 입력 폼
- 제출 시 Server Action 호출 → 생성 후 `/todos`로 이동 (Step 5 연동)

### `app/todos/[todoId]/page.tsx` (Client Component)
- URL의 `todoId`로 기존 Todo 조회
- 제목 수정 폼 (기존 title 초기값)
- 제출 시 Server Action 호출 → 수정 후 `/todos`로 이동 (Step 5 연동)

### `app/todos/error.tsx` (Client Component)
- `"use client"` 필수 선언 (Next.js 요구사항)
- `error`와 `reset` props 수신
- 에러 메시지 표시 + 재시도 버튼

### `app/todos/loading.tsx` (Server Component)
- 데이터 로딩 중 표시할 스켈레톤 UI
- `todos/page.tsx`가 async 데이터를 기다리는 동안 자동으로 표시됨

### `useSearchParams()` 사용 시 주의
WeekNavigator와 TodoFilter는 날짜/필터 URL 파라미터를 읽기 위해 `useSearchParams()`를 사용하게 된다.
Next.js에서 이 훅은 반드시 `<Suspense>` boundary 안에서 렌더링돼야 한다.
그렇지 않으면 빌드 시 에러가 발생한다.

```tsx
// todos/page.tsx에서 Client Component를 Suspense로 감싸야 함
import { Suspense } from "react"

<Suspense fallback={<div>로딩 중...</div>}>
  <WeekNavigator />
  <TodoFilter />
</Suspense>
```

---

## 구현 체크리스트

### 페이지 및 특수 파일
- [ ] `app/page.tsx` → `/todos` 리다이렉트
- [ ] `app/todos/page.tsx` — 목록 페이지 (Server Component)
- [ ] `app/todos/new/page.tsx` — 생성 페이지 (Client Component)
- [ ] `app/todos/[todoId]/page.tsx` — 수정 페이지 (Client Component)
- [ ] `app/todos/error.tsx` — 에러 화면 (Client Component)
- [ ] `app/todos/loading.tsx` — 로딩 화면 (Server Component)

### 컴포넌트
- [ ] `components/WeekNavigator.tsx` (Client Component)
- [ ] `components/TodoInput.tsx` (Client Component)
- [ ] `components/TodoFilter.tsx` (Client Component)
- [ ] `components/TodoList.tsx` (Server Component)
- [ ] `components/TodoItem.tsx` (Client Component)

### 기타
- [ ] `app/layout.tsx` — 메타데이터, 공통 레이아웃 수정
- [ ] `app/globals.css` — 2차 과제 디자인 토큰 적용
- [ ] `types/todo.ts` — 공유 타입 정의

---

## 확인 포인트

- `localhost:3000` 접속 시 `/todos`로 자동 이동하는가?
- `localhost:3000/todos` 접속 시 목록 페이지가 보이는가?
- `localhost:3000/todos/new` 접속 시 생성 페이지가 보이는가?
- `"use client"` 선언이 필요한 컴포넌트와 필요하지 않은 컴포넌트를 구분할 수 있는가?
- `loading.tsx`가 데이터 로딩 중 자동으로 표시되는가?
- `error.tsx`가 에러 발생 시 자동으로 표시되는가?
