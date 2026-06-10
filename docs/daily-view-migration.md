# 일간 뷰 마이그레이션 프롬프트

## 구현 목표

날짜 네비게이터를 추가한다.
오늘 날짜가 기본으로 선택되고, 이전 / 다음 버튼으로 하루씩 이동하며
선택된 날짜에 해당하는 Todo만 목록에 표시된다.
Todo 생성 시 현재 선택된 날짜가 자동으로 저장된다.

참고 소스: `../kakao-assignment-1/app.js` (날짜 유틸 — `getDateKey`, `createMidnightDate`, `isToday`, `formatWeekRange` / 상태 — `selectedDate`, `selectDate`, `moveWeek`, `getTodosForDate`, `addTodo`의 date 저장 부분)

---

## 1차 과제와의 핵심 차이

| 항목 | 1차 과제 (Vanilla JS) | 2차 과제 (React) |
|------|----------------------|-----------------|
| 날짜 상태 | `let selectedDate = createMidnightDate(new Date())` (모듈 변수) | `useState(createMidnightDate(new Date()))` |
| 주간 뷰 | 7일 그리드 + `weekStartDate` 별도 관리 | 일간 뷰로 단순화 — `selectedDate` 하나만 관리 |
| 날짜 이동 | `moveWeek(delta)` ±7일 + `selectDate(date)` | `handleMoveDate(delta)` ±1일 |
| 날짜별 Todo 목록 | `getFilteredTodos()` 내부에서 date 필터 후 status 필터 | `todosForDate` (`useMemo`) → `filteredTodos` (`useMemo`) 2단계 파생 |
| Todo에 날짜 저장 | `addTodo()` 내부에서 `date: getDateKey(selectedDate)` | `handleAddTodo` 내부에서 동일하게 저장 |
| 날짜 유틸 함수 | `app.js` 내부에 인라인 | `src/utils/date.js`로 분리 |
| DOM 조작 | `renderWeekView()` 직접 조작 | 상태 변경 → `DateNavigator` 자동 리렌더 |

---

## 1차 과제 참고 로직 매핑

| 1차 과제 함수/변수 | 위치 (1차 과제) | React 대응 |
|---|---|---|
| `let selectedDate = createMidnightDate(new Date())` | app.js | `const [selectedDate, setSelectedDate] = useState(createMidnightDate(new Date()))` |
| `createMidnightDate(date)` | app.js | `src/utils/date.js` — `createMidnightDate` |
| `getDateKey(date)` | app.js | `src/utils/date.js` — `getDateKey` |
| `isToday(date)` | app.js | `src/utils/date.js` — `isToday` |
| `formatWeekRange` + `DAY_LABELS` | app.js | `src/utils/date.js` — `formatDisplayDate` (신규 구현 — 로직 구조만 참고, 직접 이식하지 않는다) |
| `getTodosForDate(dateKey)` | app.js | `useMemo(() => todos.filter(t => t.date === getDateKey(selectedDate)), [todos, selectedDate])` |
| `getFilteredTodos()` (date 1단계) | app.js | 위의 `todosForDate` |
| `getFilteredTodos()` (status 2단계) | app.js | 기존 `filteredTodos` — 이제 `todos` 대신 `todosForDate` 기반 |
| `moveWeek(delta)` / `selectDate(date)` | app.js | `handleMoveDate(delta)` — `DateNavigator`에 전달 |
| `addTodo()` 내 `date: getDateKey(selectedDate)` | app.js | `handleAddTodo` 내 동일 |
| `date.setDate(d + delta)` 날짜 이동 | app.js | 함수형 업데이트: `createMidnightDate(prev)`로 새 Date 복사 후 `setDate`로 이동 |
| `resetEditState()` (날짜 이동 시 호출) | app.js | `handleMoveDate`에서 `setEditingId(null)` |

---

## 수정 대상 파일

| 파일 | 작업 |
|------|------|
| `src/utils/date.js` | 신규 생성 — 날짜 유틸 함수 분리 |
| `src/components/DateNavigator.jsx` | 신규 생성 |
| `src/App.jsx` | `selectedDate` state, `todosForDate`, `handleMoveDate` 추가. `handleAddTodo` 수정. `TodoList`에 전달하는 `totalCount`를 `todosForDate.length`로 변경. `DateNavigator` 렌더링 |
| `src/components/TodoList.jsx` | **변경 없음** — `totalCount` prop 값을 App에서 `todosForDate.length`로 교체하는 것만으로 충분하다 |

> **localStorage 지속성은 이 마이그레이션 범위 밖이다.** `selectedDate`의 localStorage 저장/복원은 todos 지속성 구현과 함께 별도 처리한다. 이 마이그레이션에서 `selectedDate`는 페이지 새로고침 시 오늘 날짜로 초기화된다.

> **기존 테스트(`App.test.jsx`) 호환성**: `handleAddTodo` 수정 후 todo 추가 시 `date` 필드가 오늘 날짜(`getDateKey(selectedDate)`)로 자동 저장된다. 테스트 환경에서도 `selectedDate`는 오늘 자정으로 초기화되므로, 기존 CRUD·필터 테스트는 추가된 todo가 `todosForDate`에 포함되어 정상 통과된다.

---

## 구현 명세

### `src/utils/date.js`

아래 함수·상수들을 export한다. `createMidnightDate` · `getDateKey` · `isToday`는 1차 과제 `app.js`의 동명 함수를 모듈로 분리 이식한다. `DAY_LABELS`와 `formatDisplayDate`는 1차 과제에 없는 신규 항목이다.

- **`DAY_LABELS`** — (신규) `['일', '월', '화', '수', '목', '금', '토']` 상수 배열. `formatDisplayDate` 내부에서 요일 이름을 참조한다.
- **`createMidnightDate(date)`** — 인수로 받은 `date`를 복사한 새 Date 객체를 만들어 시간을 00:00:00으로 초기화해 반환한다. 입력 `date`는 변경하지 않는다. 날짜 비교 시 시간 차이로 인한 오류를 방지한다.
- **`getDateKey(date)`** — Date 객체를 `'YYYY-MM-DD'` 형식의 문자열로 변환해 반환한다. Todo의 `date` 필드 저장 및 비교에 사용한다.
- **`isToday(date)`** — 주어진 날짜가 오늘인지 `boolean`으로 반환한다.
- **`formatDisplayDate(date)`** — (신규) 표시용 날짜 문자열을 반환한다. `date`의 연도가 `new Date().getFullYear()`(현재 연도)와 같으면 `"M월 D일 (요일)"`, 다르면 `"YYYY년 M월 D일 (요일)"` 형식으로 반환한다. `DAY_LABELS`를 사용해 요일을 표시한다.

### `src/components/DateNavigator.jsx`

`selectedDate`, `onPrevDate`, `onNextDate` props를 받아 날짜 네비게이터를 렌더링한다.

- 루트 요소 — `<nav aria-label="날짜 탐색">`으로 감싸 스크린리더에 탐색 영역임을 전달한다.
- 이전 날짜 버튼 — `aria-label="이전 날짜"`, 클릭 시 `onPrevDate()` 호출
- 날짜 표시 영역 — `<time dateTime={getDateKey(selectedDate)}>` 요소로 `formatDisplayDate(selectedDate)` 출력. 오늘이면 "오늘" 뱃지를 함께 표시한다.
- 다음 날짜 버튼 — `aria-label="다음 날짜"`, 클릭 시 `onNextDate()` 호출
- 스타일은 Tailwind 인라인으로 적용하되, 색상은 `CLAUDE.md`에 정의된 디자인 토큰(`text-primary`, `text-text-secondary` 등)을 준수한다.

### `src/App.jsx`

**state 추가**
- `selectedDate` — 초기값은 `createMidnightDate(new Date())` (오늘 자정)

**파생값 추가 및 기존 파생값 수정**
- `todosForDate` — `todos`와 `selectedDate`로부터 `useMemo`로 파생한다. `todos.filter(todo => todo.date === getDateKey(selectedDate))`. **반드시 `filteredTodos` useMemo보다 먼저 선언해야 한다** — `todosForDate`는 `const`로 선언되므로 선언 전에 참조하면 `ReferenceError: Cannot access 'todosForDate' before initialization`이 발생한다.
- 기존 `filteredTodos` — 콜백 내부의 **모든 `todos` 참조를 `todosForDate`로 교체**하고, 의존성 배열을 `[todosForDate, filter]`로 변경한다. 두 가지 모두 변경해야 한다. 특히 FILTER.ALL 케이스의 `return todos`도 반드시 `return todosForDate`로 교체해야 한다 — 이 분기를 빠뜨리면 "전체" 탭에서 날짜와 무관하게 모든 날짜의 todo가 표시된다.
- `TodoList`에 전달하는 `totalCount` — 기존 `todos.length`에서 `todosForDate.length`로 변경한다. `TodoList`는 `totalCount === 0`이면 "할 일이 없습니다.", 아니면 "해당하는 할 일이 없습니다."를 보여주는데, 이 분기가 전체 todos가 아닌 선택 날짜 기준으로 동작해야 한다. 예: 선택 날짜에 todo가 전혀 없으면 "할 일이 없습니다.", 선택 날짜에 todo는 있으나 필터 조건에 맞는 것이 없으면 "해당하는 할 일이 없습니다."

**핸들러 추가 및 수정**
- `handleMoveDate(delta)` — `setEditingId(null)`로 편집 상태를 초기화하고 `selectedDate`를 갱신한다. 편집 초기화가 필요한 이유: 날짜가 이동하면 편집 중인 항목이 다른 날짜 소속이어서 화면에서 사라지고, `editingId`가 고아 상태로 남기 때문이다. `handleFilterChange`가 편집 상태를 초기화하는 것과 같은 이유지만, `handleMoveDate`는 필터를 초기화하지 않는다는 점에서 다르다. `selectedDate` 갱신은 `prev`를 직접 수정하지 않고 `createMidnightDate(prev)`로 새 Date를 복사한 뒤 `delta`일 이동해 반환하는 함수형 업데이트를 사용한다. `DateNavigator`에 `onPrevDate={() => handleMoveDate(-1)}`, `onNextDate={() => handleMoveDate(1)}` 형태로 전달한다. 필터 상태(`filter`)는 초기화하지 않는다 — 선택한 필터가 새 날짜에서도 유지되는 것이 의도된 동작이다.
- `handleAddTodo` — 새 Todo 객체에 `date: getDateKey(selectedDate)` 필드를 추가한다.

**JSX 배치**
- `<main>` 안의 최종 렌더링 순서: `DateNavigator` → `TodoInput` → `TodoFilter` → `TodoList`

---

## 검증 포인트

- [ ] 초기 진입 시 오늘 날짜가 선택되고 "오늘" 뱃지가 표시됨
- [ ] 이전 / 다음 버튼으로 날짜가 하루씩 정확히 이동됨
- [ ] 선택된 날짜에 해당하는 Todo만 목록에 표시됨
- [ ] 날짜 A에서 Todo를 추가하고 날짜 B로 이동하면 해당 Todo가 보이지 않음
- [ ] 날짜 B에서 추가한 Todo는 다시 날짜 A로 이동해도 보이지 않음
- [ ] Todo의 `date` 필드가 `'YYYY-MM-DD'` 형식의 문자열로 저장됨 *(단위 테스트로 검증)*
- [ ] 날짜 이동 시 편집 상태가 초기화됨
- [ ] 날짜 이동 시 필터 상태는 유지됨 (예: "완료" 필터 상태에서 날짜 이동 시 새 날짜에서도 완료 필터 적용)
- [ ] 기존 필터(전체 / 진행 중 / 완료)가 날짜와 함께 올바르게 적용됨

---

## 금지 사항

- `todosForDate`를 `useState`로 저장 금지 — `todos`와 `selectedDate`로부터 `useMemo`로 파생할 것
- `filteredTodos`를 `useMemo` 없이 인라인 계산 금지 — 렌더마다 불필요한 재계산 발생
- `DateNavigator` 등 표시 컴포넌트에서 `Date` 객체나 날짜 원시값을 `getDateKey` 없이 직접 비교 금지 — 날짜 비교가 필요한 경우 반드시 `getDateKey`를 통해 정규화된 문자열로 비교할 것
- `DateNavigator` 내부에서 날짜 이동 로직 직접 구현 금지 — `onPrevDate` / `onNextDate` prop을 통해 위임할 것
- `new Date(dateString)` 방식으로 날짜 파싱 금지 — 타임존 오류 발생 가능. `createMidnightDate` 또는 연·월·일 분리 파싱 사용. 단, `new Date(dateObject)` 형태로 Date 객체를 복사하는 것은 허용된다 (`createMidnightDate` 내부 구현 등).
