# Step 5 — API 연동 구현

## 목표

Step 4에서 stub(빈 배열, 빈 함수)으로 남겨둔 부분을 실제 FastAPI와 연결한다.

구현 대상:
- `backend/main.py` — GET /todos/{id} 엔드포인트 추가
- `frontend/app/actions.ts` — Server Actions: Server Component에서 FastAPI 직접 호출 (조회)
- `frontend/app/api/todos/route.ts` — HTTP 프록시: Client Component → Next.js → FastAPI (GET, POST)
- `frontend/app/api/todos/[id]/route.ts` — HTTP 프록시: Client Component → Next.js → FastAPI (PUT, DELETE)
- 컴포넌트 6곳 연결

---

## 데이터 흐름

```
[Server Component]          [Client Component]
     │                            │
     ▼                            ▼
 actions.ts               fetch('/api/todos')
(직접 FastAPI 호출)              │
     │                            ▼
     │                    app/api/todos/route.ts
     │                    app/api/todos/[id]/route.ts
     │                            │
     └──────────┬─────────────────┘
                ▼
         FastAPI (localhost:8000)
                ▼
           SQLite DB
```

Server Component는 `actions.ts`를 import해서 서버에서 직접 FastAPI를 호출한다.  
Client Component는 Next.js API Route(`route.ts`)를 통해 FastAPI로 요청을 중계한다.  
두 방식 모두 브라우저는 FastAPI URL을 알 수 없다.

---

## 1. 백엔드 변경: GET /todos/{id} 추가

**파일**: `backend/main.py`

현재 백엔드에는 GET /todos/{id} 엔드포인트가 없다.  
`[todoId]/page.tsx`(수정 페이지)에서 기존 Todo 제목을 불러오려면 이 엔드포인트가 필요하다.

```python
# PUT /todos/{todo_id} 엔드포인트 앞에 추가

# GET /todos/{todo_id} — 단건 조회
# id에 해당하는 Todo가 없으면 404 반환
@app.get("/todos/{todo_id}", response_model=TodoResponse)
def get_todo(todo_id: int, db=Depends(get_db)):
    db_todo = db.query(Todo).filter(Todo.id == todo_id).first()
    if not db_todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    return db_todo
```

---

## 2. 환경 변수 설정

**파일**: `frontend/.env.local`

Next.js 서버(actions.ts, route.ts)에서 FastAPI URL을 환경변수로 관리한다.  
`NEXT_PUBLIC_` 접두사 없이 선언하면 서버에서만 접근 가능하다 (브라우저에 노출되지 않음).

```
BACKEND_URL=http://localhost:8000
```

---

## 3. app/actions.ts — Server Actions (조회)

**파일 위치**: `frontend/app/actions.ts`

`'use server'`를 파일 최상단에 선언하면 해당 파일의 모든 export 함수가 Server Action이 된다.  
Server Component에서 `import { getTodos } from '@/app/actions'`로 직접 호출한다.

조회 함수만 여기에 둔다. 변경(생성/수정/삭제)은 Client Component에서 route.ts를 통해 처리한다.

```typescript
'use server'

import type { Todo } from '@/types/todo'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000'

// 전체 또는 특정 날짜의 Todo 목록 조회
export async function getTodos(date?: string): Promise<Todo[]> {
  const url = date
    ? `${BACKEND_URL}/todos?date=${encodeURIComponent(date)}`
    : `${BACKEND_URL}/todos`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error('할 일 목록을 불러오지 못했습니다.')
  return res.json()
}

// 단건 조회 (수정 페이지 초기값용)
export async function getTodo(id: number): Promise<Todo | null> {
  const res = await fetch(`${BACKEND_URL}/todos/${id}`, { cache: 'no-store' })
  if (res.status === 404) return null
  if (!res.ok) throw new Error('할 일을 불러오지 못했습니다.')
  return res.json()
}
```

> **`cache: 'no-store'`**: Next.js는 기본적으로 fetch 응답을 캐시한다.
> Todo 목록은 변경이 잦으므로 캐시 없이 매번 FastAPI에서 새로 가져온다.

---

## 4. app/api/todos/route.ts — GET, POST 프록시

**파일 위치**: `frontend/app/api/todos/route.ts`

Client Component가 `fetch('/api/todos')` 로 호출하는 Next.js API Route.  
이 파일 자체가 HTTP 엔드포인트이며, 요청을 FastAPI로 중계(proxy)한다.

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000'

// GET /api/todos?date=YYYY-MM-DD
export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get('date')
  const url = date
    ? `${BACKEND_URL}/todos?date=${encodeURIComponent(date)}`
    : `${BACKEND_URL}/todos`
  const res = await fetch(url)
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

// POST /api/todos — 새 Todo 생성
export async function POST(request: NextRequest) {
  const body = await request.json()
  const res = await fetch(`${BACKEND_URL}/todos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (res.ok) revalidatePath('/todos') // 목록 페이지 캐시 무효화
  return NextResponse.json(data, { status: res.status })
}
```

> **`revalidatePath('/todos')`**: 뮤테이션 성공 후 서버 캐시를 무효화한다.
> 이후 Client Component에서 `router.refresh()`를 호출하면 Server Component가 새 데이터로 다시 렌더링된다.

---

## 5. app/api/todos/[id]/route.ts — PUT, DELETE 프록시

**파일 위치**: `frontend/app/api/todos/[id]/route.ts`

`PUT /api/todos/1`, `DELETE /api/todos/1` 처럼 id가 URL에 포함되는 요청을 처리한다.

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000'

interface RouteParams {
  params: Promise<{ id: string }>
}

// PUT /api/todos/[id] — 제목 수정 또는 완료 상태 토글
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const body = await request.json()
  const res = await fetch(`${BACKEND_URL}/todos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (res.ok) revalidatePath('/todos')
  return NextResponse.json(data, { status: res.status })
}

// DELETE /api/todos/[id] — Todo 삭제
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const res = await fetch(`${BACKEND_URL}/todos/${id}`, { method: 'DELETE' })
  if (res.ok) revalidatePath('/todos')
  // FastAPI가 204 No Content를 반환하므로 body 없이 응답
  return new NextResponse(null, { status: res.status })
}
```

> **Next.js 15+ `params` Promise**: App Router에서 동적 세그먼트 params도 Promise다.
> `params.id`가 아니라 `await params`로 구조분해해야 한다.

---

## 6. 컴포넌트 연동

### 6-1. app/todos/page.tsx — getTodos() 연결

Server Component. `actions.ts`에서 getTodos를 import해 직접 호출한다.

변경 내용:
1. `import { getTodos } from '@/app/actions'` 추가
2. stub 배열 `const todos: Todo[] = []`를 실제 API 호출로 교체
3. 전체 Todo에서 날짜별 카운트(`todoCountByDate`) 집계

```typescript
// 기존 (stub)
const todos: Todo[] = []
const todoCountByDate: Record<string, number> = {}

// 교체 후
const [todos, allTodos] = await Promise.all([
  getTodos(selectedDate),  // 선택된 날짜의 Todo만
  getTodos(),              // 주간 날짜 아이콘 카운트용 (전체)
])
const todoCountByDate = allTodos.reduce<Record<string, number>>((acc, todo) => {
  acc[todo.date] = (acc[todo.date] ?? 0) + 1
  return acc
}, {})
```

`Promise.all`로 두 요청을 병렬로 날린다. 순차 요청보다 빠르다.

---

### 6-2. app/todos/[todoId]/page.tsx — getTodo() 연결

Server Component. 수정 페이지 진입 시 기존 Todo 제목을 불러온다.

변경 내용:
1. `import { getTodo } from '@/app/actions'` 추가
2. stub `const initialTitle = ''`를 실제 호출로 교체

```typescript
// 기존 (stub)
const initialTitle = ''

// 교체 후
const todo = await getTodo(id)
if (!todo) notFound()
const initialTitle = todo.title
```

---

### 6-3. components/TodoInput.tsx — POST /api/todos 연결

Client Component. 목록 페이지 인라인 입력창.  
`fetch('/api/todos')` POST 후 `router.refresh()`로 목록 갱신.

변경 내용:
1. `useRouter` import 추가
2. `handleSubmit`에서 fetch 호출 후 상태 초기화 + router.refresh()
3. `void selectedDate` lint 우회 코드 제거

```typescript
// handleSubmit 내부 교체
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  const trimmed = title.trim()
  if (!trimmed) {
    setError(EMPTY_TODO_ERROR)
    inputRef.current?.focus()
    return
  }

  const res = await fetch('/api/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: trimmed, date: selectedDate }),
  })
  if (res.ok) {
    setTitle('')
    setError('')
    router.refresh()  // Server Component 재렌더링으로 목록 갱신
  }
}
```

---

### 6-4. components/TodoItem.tsx — PUT, DELETE 연결

Client Component. 완료 토글과 삭제 버튼.

변경 내용:
1. `useRouter` 이미 있음, `router.refresh()` 활용
2. `handleToggle`: PUT /api/todos/{id} with { completed: !todo.completed }
3. `handleDelete`: DELETE /api/todos/{id}

```typescript
async function handleToggle() {
  const res = await fetch(`/api/todos/${todo.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed: !todo.completed }),
  })
  if (res.ok) router.refresh()
}

async function handleDelete() {
  const res = await fetch(`/api/todos/${todo.id}`, { method: 'DELETE' })
  if (res.ok) router.refresh()
}
```

> **낙관적 업데이트 미적용**: 실패 시 롤백 로직이 복잡해진다. 이 과제 범위에서는
> 서버 응답 후 router.refresh()로 목록 갱신하는 방식으로 충분하다.

---

### 6-5. app/todos/[todoId]/EditTodoForm.tsx — PUT 연결

Client Component. 수정 폼 제출 시 PUT /api/todos/{id}.  
성공 후 `/todos`로 이동하면 목록 페이지가 새 데이터로 렌더링된다.

변경 내용:
1. `handleSubmit`을 async로 변경, fetch 호출 추가
2. `void todoId` lint 우회 코드 제거

```typescript
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  const trimmed = title.trim()
  if (!trimmed) {
    setError(EMPTY_TODO_ERROR)
    return
  }

  const res = await fetch(`/api/todos/${todoId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: trimmed }),
  })
  if (res.ok) router.push('/todos')
}
```

---

### 6-6. app/todos/new/page.tsx — POST 연결

Client Component. 별도 생성 페이지.  
성공 후 `/todos`로 이동.

변경 내용:
1. `handleSubmit`을 async로 변경, fetch 호출 추가
2. 성공 시 router.push 실행

```typescript
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  const trimmed = title.trim()
  if (!trimmed) {
    setError(EMPTY_TODO_ERROR)
    return
  }

  const res = await fetch('/api/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: trimmed, date }),
  })
  if (res.ok) router.push('/todos')
}
```

---

## 파일 생성/수정 체크리스트

### 생성
- [ ] `frontend/.env.local` — BACKEND_URL 환경변수
- [ ] `frontend/app/actions.ts` — getTodos, getTodo Server Actions
- [ ] `frontend/app/api/todos/route.ts` — GET, POST 프록시
- [ ] `frontend/app/api/todos/[id]/route.ts` — PUT, DELETE 프록시

### 수정
- [ ] `backend/main.py` — GET /todos/{id} 엔드포인트 추가
- [ ] `frontend/app/todos/page.tsx` — getTodos() 연결, todoCountByDate 집계
- [ ] `frontend/app/todos/[todoId]/page.tsx` — getTodo() 연결
- [ ] `frontend/components/TodoInput.tsx` — POST fetch + router.refresh()
- [ ] `frontend/components/TodoItem.tsx` — PUT, DELETE fetch + router.refresh()
- [ ] `frontend/app/todos/[todoId]/EditTodoForm.tsx` — PUT fetch + router.push()
- [ ] `frontend/app/todos/new/page.tsx` — POST fetch + router.push()

---

## 확인 포인트

- Todo를 생성했을 때 FastAPI DB에 실제로 저장되나요?
- 목록 페이지에서 생성한 Todo가 바로 표시되나요?
- 수정, 삭제 후 목록이 올바르게 업데이트되나요?
- 브라우저 네트워크 탭에서 요청이 `/api/todos`로 가는지, `localhost:8000`으로는 안 가는지 확인하세요.
