# 상태별 필터링 기능 마이그레이션 프롬프트

## 구현 목표

전체 / 진행 중 / 완료 필터 탭을 추가한다.
필터 상태는 `useState`로 관리하며, 탭 전환 후 새 Todo를 추가해도 필터가 유지된다.

참고 소스: `../kakao-assignment-1/app.js` (필터링 섹션 — `getFilteredTodos`, `setFilter`, `getEmptyMessage`)

---

## 1차 과제와의 핵심 차이

| 항목 | 1차 과제 (Vanilla JS) | 2차 과제 (React) |
|------|----------------------|-----------------|
| 필터 상태 | `let currentFilter = 'all'` (모듈 변수) | `useState(FILTER.ALL)` |
| 필터 적용 | `getFilteredTodos()` 직접 호출 | `useMemo`로 파생 — 별도 state 없음 |
| 탭 활성 업데이트 | `classList.toggle` + `setAttribute` 직접 조작 | 상태 변경 → React 자동 리렌더 |
| 빈 상태 메시지 | `getEmptyMessage()` 분기 함수 | `totalCount` prop → `TodoList` 내 분기 |
| 편집 상태 초기화 | `setFilter`에서 `resetEditState()` 호출 | `handleToggleTodo`에서 토글 대상이 편집 중이면 `setEditingId(null)` |

---

## 1차 과제 참고 로직 매핑

| 1차 과제 함수 | 위치 | React 대응 |
|---|---|---|
| `let currentFilter = 'all'` | App | `const [filter, setFilter] = useState(FILTER.ALL)` |
| `getFilteredTodos()` | App | `useMemo(() => ..., [todos, filter])` |
| `setFilter(filter)` | App | `handleFilterChange(filter)` → `setFilter(filter)` |
| `getEmptyMessage()` | — | `totalCount` prop으로 `TodoList` 내 분기 처리 |
| `setFilter`의 `resetEditState()` | App | `handleToggleTodo`에서 `editingId === id`이면 `setEditingId(null)` |
| `document.querySelectorAll('.filter-tab')` DOM 조작 | — | 상태 변경 → `TodoFilter` 자동 리렌더 |

---

## 수정 대상 파일

| 파일 | 작업 |
|------|------|
| `src/constants/todo.js` | `FILTER`, `FILTER_LABELS` 상수 추가 |
| `src/components/TodoFilter.jsx` | 신규 생성 |
| `src/App.jsx` | `filter` state, `filteredTodos`, `handleFilterChange` 추가. `handleToggleTodo` 수정. `TodoFilter` 렌더링 |
| `src/components/TodoList.jsx` | 빈 상태 메시지 분기 수정 |

---

## 구현 명세

### `src/constants/todo.js`
`FILTER` 객체 상수(`all`, `active`, `completed`)와 각 값의 한국어 레이블을 담은 `FILTER_LABELS`를 추가한다.

### `src/components/TodoFilter.jsx`
`filter`, `onFilterChange` props를 받아 상호 배타적인 필터 선택 UI를 렌더링한다.
- 표시 순서를 명시한 `FILTER_ORDER`를 순회한다. 필터 UI를 3개 하드코딩하지 않는다.
- 현재 선택된 필터는 조건부 클래스로 시각적으로 구분한다.
- 접근성: `<fieldset>`과 같은 `name`을 가진 radio input을 사용해 하나만 선택되도록 한다.
- 숨긴 radio의 키보드 포커스가 표시 요소에 보이도록 `peer-focus-visible` 스타일을 적용한다.
- 스타일은 Tailwind 인라인으로 적용한다.

### `src/App.jsx`
- `filter` state를 추가하고 초기값은 `FILTER.ALL`로 설정한다.
- `filteredTodos`는 `todos`와 `filter`로부터 `useMemo`로 파생한다. 별도 state로 저장하지 않는다.
- `handleFilterChange`를 추가하고 `TodoFilter`에 전달한다.
- `handleToggleTodo`에서 토글 대상이 현재 편집 중인 항목이면 `editingId`를 초기화한다. 필터에 의해 해당 TodoItem이 언마운트될 때 editingId가 고아 상태로 남는 것을 방지한다.
- JSX에서 `TodoFilter`를 `TodoInput`과 `TodoList` 사이에 배치한다.
- `TodoList`에 `todos` 대신 `filteredTodos`를 전달하고, `totalCount`(전체 todos 개수)도 함께 전달한다.

### `src/components/TodoList.jsx`
`totalCount` prop을 추가로 받아 빈 상태 메시지를 분기한다.
- `totalCount === 0`: "할 일이 없습니다 / 추가해보세요"
- `totalCount > 0`이지만 필터 결과가 없음: "해당하는 할 일이 없습니다"

---

## 검증 포인트

- [ ] 각 탭 클릭 시 해당 상태의 Todo만 표시됨
- [ ] 탭 전환 후 새 Todo 추가 시 현재 필터 유지
- [ ] 선택된 탭이 시각적으로 구분됨
- [ ] Todo가 없을 때와 필터 결과만 없을 때 메시지가 다름
- [ ] 편집 중인 Todo를 체크박스로 완료 처리 시 편집 상태가 정상 종료됨

---

## 금지 사항

- DOM 직접 조작 금지
- `filteredTodos`를 `useState`로 저장 금지
- `TodoList`, `TodoItem` 내부에 필터 로직 삽입 금지
- 필터 값을 문자열 리터럴로 직접 비교 금지 (`'all'`, `'active'` 하드코딩 금지)
