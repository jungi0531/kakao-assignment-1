# Goal: Todo CRUD 기능 마이그레이션

## 목표 개요

1차 과제(Vanilla JS)의 Todo CRUD 기능을 React 방식으로 마이그레이션한다.
핵심 차이는 `prompt()` 대신 **인라인 편집 UI** 를, 전역 변수 대신 **`useState`** 를 사용하는 것이다.

---

## 이번 단계 범위

**포함:** Todo 생성 · 목록 표시 · 인라인 수정 · 완료 토글 · 삭제

**제외 (후속 단계 예정):** localStorage 영속성, 필터링(전체/진행/완료), 주간 날짜 뷰, 통계, 자정 자동 갱신

---

## 1차 과제와의 핵심 차이

| 항목 | 1차 과제 (Vanilla JS) | 2차 과제 (React) |
|------|----------------------|-----------------|
| 수정 UI | ~~`prompt()` 팝업~~ → 인라인 input | 인라인 input (동일 방향 유지) |
| 상태 관리 | 모듈 레벨 변수 (`let editingId`, `let editError`) | `useState` hook |
| 렌더링 | `renderTodos()` 직접 호출 | 상태 변경 → React 자동 리렌더 |
| DOM 조작 | `innerHTML`, `createElement` | JSX |
| 포커스 제어 | `querySelector` + `setSelectionRange` | `useRef` + `useEffect` |

> 1차 과제에서 이미 `prompt()` 대신 인라인 편집을 구현했으므로,
> UI 패턴 자체는 동일하다. 차이는 **상태를 어디서 어떻게 관리하느냐** 이다.

---

## 구현 목록 (체크리스트)

### Create
- [ ] 텍스트 입력창과 추가 버튼으로 새 Todo 생성
- [ ] 입력값이 비어있으면 Todo를 생성하지 않고 안내 메시지 표시
- [ ] Enter 키로도 Todo 추가 가능
- [ ] 추가 완료 후 입력창 초기화

### Read
- [ ] 생성된 Todo 목록을 화면에 표시
- [ ] 목록이 비었을 때 빈 상태 안내 메시지 표시

### Update (인라인 편집)
- [ ] 수정 버튼 클릭 시 해당 Todo 텍스트를 인라인 input으로 전환
- [ ] 편집 input에 자동 포커스 이동, 커서는 텍스트 끝으로 (`useRef` + `useEffect`)
- [ ] Enter 키로 저장, Escape 키로 취소
- [ ] 저장 시 빈 값이면 에러 메시지 표시 + 편집 모드 유지 + input 재포커스
- [ ] 저장 성공 시 편집 모드 해제 후 갱신된 텍스트 표시

### Delete
- [ ] 삭제 버튼 클릭 시 해당 Todo 제거

### Complete (완료 토글)
- [ ] 체크박스(또는 완료 버튼) 클릭으로 완료 상태 토글
- [ ] 완료된 Todo는 텍스트에 취소선 표시로 시각적 구분

---

## 컴포넌트 설계 방향

```
App
├── TodoInput          # 입력창 + 추가 버튼 + 에러 메시지
└── TodoList
    └── TodoItem       # 개별 Todo 행 (일반 모드 / 편집 모드 분기)
```

### 상태 위치

**App (또는 `useTodos` 커스텀 훅)**
```
- todos: []                  // Todo 배열 — 모든 컴포넌트가 공유하므로 상위에서 관리
- editingId: null | number   // 현재 편집 중인 Todo id — 동시에 하나만 열려야 하므로 상위에서 관리
```

**TodoInput (로컬)**
```
- inputText: string          // 입력창 텍스트 — TodoInput만 사용하므로 로컬로 충분
```

**TodoItem (로컬)**
```
- editText: string           // 편집 중인 텍스트 — 해당 항목에만 해당하는 관심사
- editError: boolean         // 빈 값 에러 여부 — 해당 항목에만 해당하는 관심사
```

> `editError` 와 `editText` 를 App에 올리면 편집 에러 발생 시 전체 목록이 리렌더되는 비효율이 생긴다.
> `editingId` 만 App에 두고 나머지 편집 로컬 상태는 TodoItem에서 관리하는 것이 React 모범 사례다.

---

## 1차 과제 참고 로직 매핑

| 1차 과제 함수 | 위치 | React 대응 |
|-------------|------|-----------|
| `addTodo()` | App | `handleAddTodo(text)` |
| `toggleTodo(id)` | App | `handleToggleTodo(id)` |
| `deleteTodo(id)` | App | `handleDeleteTodo(id)` |
| `startEditTodo(id)` | App | `setEditingId(id)` |
| `saveEditTodo(id)` | App + TodoItem | `handleSaveEdit(id, newText)` — 빈 값이면 `editError` (TodoItem 로컬)로 에러 표시, 재포커스 후 편집 유지 |
| `cancelEditTodo()` | App | `setEditingId(null)` |
| `renderTodos()` | — | 상태 변경 → React 자동 리렌더 |

---

## 확인 포인트

- `editingId === todo.id` 가 `true`/`false`로 바뀔 때 TodoItem이 `<input>` ↔ `<span>` 을 전환하는가?
- `useState` 는 어느 컴포넌트에 선언되어 있고, 어떤 값을 관리하는가?
- Todo 생성 → 수정 → 완료 → 삭제 전체 흐름이 순서대로 동작하는가?
