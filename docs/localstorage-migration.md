# 로컬 스토리지 연동 마이그레이션 프롬프트

## 구현 목표

Todo 목록과 현재 선택된 날짜를 localStorage에 저장한다.
페이지를 새로고침하거나 App을 다시 마운트해도 마지막 상태를 복원한다.

React에서는 추가·수정·완료·삭제 핸들러마다 저장 함수를 직접 호출하지 않는다.
`todos`와 `selectedDate`를 각각 감시하는 `useEffect`가 상태 변경을 자동으로 저장하고,
`useState` lazy initializer가 리렌더마다 storage를 다시 읽지 않고 마운트 초기값을 복원한다.

참고 소스: `../kakao-assignment-1/app.js`
(상수 — `STORAGE_KEY`, `DATE_STORAGE_KEY` / 함수 — `saveTodos`, `loadTodos`, `saveSelectedDate`, `loadSelectedDate`)

---

## 이번 단계 범위

**포함**

- Todo 목록 저장·복원
- 선택 날짜 저장·복원
- JSON 직렬화·역직렬화
- 잘못된 저장 데이터에 대한 안전한 폴백
- localStorage 관련 자동화 테스트와 테스트 간 데이터 격리

**제외**

- `filter`, `editingId`, 입력 중인 텍스트 등 일시적인 UI 상태 저장
- 여러 탭 사이의 `storage` 이벤트 동기화
- 서버 저장소 또는 사용자 계정 기반 동기화
- 저장 데이터 버전 관리와 복잡한 스키마 마이그레이션
- 주간 뷰에서 사용했던 `my-tasks-week-start` 키 복원

---

## 1차 과제와의 핵심 차이

| 항목 | 1차 과제 (Vanilla JS) | 2차 과제 (React) |
|------|----------------------|-----------------|
| Todo 저장 시점 | CRUD 함수마다 `saveTodos()` 직접 호출 | `useEffect([todos])`에서 일괄 저장 |
| 선택 날짜 저장 시점 | 날짜 변경 함수마다 `saveSelectedDate()` 직접 호출 | `useEffect([selectedDate])`에서 일괄 저장 |
| 초기 데이터 복원 | 앱 시작 시 `loadTodos()`·`loadSelectedDate()` 명령형 호출 | `useState(loadStored...)` lazy initializer |
| JSON 오류 처리 | 별도 처리 없음 | `try-catch` 후 안전한 기본값 사용 |
| 저장 데이터 검증 | 파싱 결과를 그대로 신뢰 | Todo 배열·Todo 필드·날짜 문자열 검증 |
| 날짜 파싱 | 연·월·일 분리 파싱 | 동일한 원칙을 `parseDateKey` 유틸로 캡슐화 |
| 저장 책임 | 여러 이벤트 핸들러에 분산 | 상태 변경을 감시하는 Effect 두 곳으로 집중 |

---

## 저장 데이터 계약

localStorage는 문자열만 저장할 수 있으므로 Todo 배열은 `JSON.stringify`로 직렬화하고,
복원할 때 `JSON.parse`로 역직렬화한다.

### `my-tasks-todos`

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "text": "React 상태 관리 학습",
    "completed": false,
    "date": "2026-06-10"
  }
]
```

복원 가능한 Todo는 아래 조건을 모두 만족해야 한다.

- 일반 객체이며 `null` 또는 배열이 아님
- `id`가 비어 있지 않은 문자열 또는 안전한 정수(`Number.isSafeInteger`)
- `text`를 trim한 결과가 1자 이상 100자 이하인 문자열
- `completed`가 boolean
- `date`가 `parseDateKey(date) !== null`을 만족하는 지원 범위의 실제 `YYYY-MM-DD` 날짜

파싱한 최상위 값이 배열이 아니면 전체를 빈 배열로 처리한다.
배열 안에 잘못된 항목이 섞여 있으면 유효한 Todo만 복원한다.
ID는 `String(id)`로 정규화하고, 정규화된 ID가 중복되면 먼저 등장한 Todo만 유지한다.
중복 ID를 그대로 복원하면 React key가 충돌하고 id 기반 수정·삭제가 여러 항목에 동시에 적용될 수 있기 때문이다.
숫자 `1`과 문자열 `'1'`도 React key에서는 같은 값으로 처리되므로 중복으로 판단한다.

유효한 항목은 `{ id: String(id), text: text.trim(), completed, date }` 형태의 새 객체로 정규화한다.
알 수 없는 추가 필드는 저장 상태로 가져오지 않으며 원본 객체를 직접 수정하지 않는다.

1차 과제에서 생성한 숫자 ID와 현재 React 앱의 문자열 ID는 모두 허용한다.
`date`가 없는 구버전·비정상 항목은 어느 날짜에 표시해야 하는지 결정할 수 없으므로 복원하지 않는다.
React가 저장한 문자열 ID도 1차 과제의 id 비교·저장 구조에서 사용할 수 있으므로 동일 origin에서의 양방향 데이터 계약을 유지한다.

### `my-tasks-selected-date`

```text
2026-06-10
```

연도 `1000`~`9999` 범위의 `YYYY-MM-DD` 형식과 실제 달력 날짜를 모두 검증한다.
값이 없거나 `2026-02-31`, `invalid-date`처럼 유효하지 않으면 오늘 자정으로 복원한다.

> localStorage는 같은 **origin(프로토콜 + 호스트 + 포트)** 에서만 공유된다.
> 1차 과제와 동일한 키를 사용하더라도 실행 포트가 다르면 데이터는 자동으로 공유되지 않는다.

---

## 상태 생명주기

```text
첫 마운트
  localStorage 읽기
    → JSON/스키마/날짜 검증
    → useState lazy initializer의 초기값으로 사용
    → 화면 렌더링
    → useEffect가 검증을 통과한 현재 상태를 다시 저장

사용자 동작
  추가·수정·완료·삭제
    → setTodos
    → todos 변경
    → useEffect([todos])
    → JSON.stringify(todos)
    → localStorage 저장

날짜 이동
  setSelectedDate
    → selectedDate 변경
    → useEffect([selectedDate])
    → getDateKey(selectedDate)
    → localStorage 저장
```

마운트 직후 Effect가 실행되는 것은 의도된 동작이다.
손상되거나 일부 항목이 잘못된 저장 데이터는 복원 단계에서 정리되고,
Effect 실행 후 검증을 통과한 정규화 데이터로 localStorage가 갱신된다.
저장값이 전혀 없는 최초 방문에도 `[]`와 오늘 날짜 키가 생성된다.
이 초기 저장 및 자동 교정은 의도된 자가 복구 동작이다.

개발 환경의 `StrictMode`에서는 initializer와 Effect가 검증 목적으로 반복 실행될 수 있다.
읽기 함수는 상태를 변경하지 않는 순수한 계산이어야 하며,
동일한 키에 동일한 값을 쓰는 저장 Effect는 반복 실행되어도 결과가 같아야 한다.

---

## 1차 과제 참고 로직 매핑

| 1차 과제 함수/변수 | 위치 (1차 과제) | React 대응 |
|---|---|---|
| `const STORAGE_KEY = 'my-tasks-todos'` | app.js | `TODOS_STORAGE_KEY` |
| `const DATE_STORAGE_KEY = 'my-tasks-selected-date'` | app.js | `SELECTED_DATE_STORAGE_KEY` |
| `saveTodos()` | app.js | `useEffect(() => saveTodosToStorage(todos), [todos])` |
| `loadTodos()` | app.js | `useState(loadTodosFromStorage)` |
| `saveSelectedDate()` | app.js | `useEffect(() => saveSelectedDateToStorage(selectedDate), [selectedDate])` |
| `loadSelectedDate()` | app.js | `useState(loadSelectedDateFromStorage)` |
| 날짜 문자열 분리 파싱 | `loadSelectedDate()` | `parseDateKey(value)` |
| 앱 하단의 `loadTodos()` 호출 | app.js | 불필요 — lazy initializer가 초기 렌더 중 실행 |
| CRUD 함수의 `saveTodos()` 호출 | 각 CRUD 함수 | 불필요 — `todos` 변경 Effect가 담당 |

---

## 수정 대상 파일

| 파일 | 작업 |
|------|------|
| `src/constants/storage.js` | 신규 생성 — localStorage 키 상수 정의 |
| `src/utils/date.js` | 지원 연도 상수·`isSupportedDate`·`parseDateKey` 추가 |
| `src/utils/storage.js` | 신규 생성 — 저장 데이터 읽기·검증·쓰기 함수 분리 |
| `src/App.jsx` | state lazy initializer, 저장 `useEffect`, 날짜 이동 경계 처리 추가 |
| `src/test/setup.js` | 각 테스트 종료 후 localStorage 초기화 |
| `src/App.test.jsx` | 저장·복원·손상 데이터 폴백 테스트 추가 |

`TodoInput`, `TodoList`, `TodoItem`, `DateNavigator`는 변경하지 않는다.
저장소 연동은 상태 소유자인 `App`과 저장 유틸의 책임이다.

---

## 구현 명세

### `src/constants/storage.js`

아래 상수를 named export한다.

- `TODOS_STORAGE_KEY` — `'my-tasks-todos'`
- `SELECTED_DATE_STORAGE_KEY` — `'my-tasks-selected-date'`

키 문자열은 다른 파일에 다시 하드코딩하지 않는다.
1차 과제의 `DATE_STORAGE_KEY`보다 용도가 분명한 이름을 사용하되 실제 저장 키 값은 유지한다.

### `src/utils/date.js`

아래 상수와 함수를 named export로 추가한다.

- `MIN_SUPPORTED_YEAR` — `1000`
- `MAX_SUPPORTED_YEAR` — `9999`
- `isSupportedDate(date)` — 유효한 Date이고 연도가 지원 범위 안이면 `true`
- `parseDateKey(value)`
  - 문자열이 아니면 `null` 반환
  - 정규식 `/^(?:[1-9]\d{3})-\d{2}-\d{2}$/`과 일치하지 않으면 `null` 반환
  - `split('-').map(Number)`로 연·월·일 분리
  - `new Date(year, month - 1, day)`로 로컬 날짜 생성
  - 생성한 날짜를 `createMidnightDate`로 정규화
  - `isSupportedDate(parsedDate)`가 false면 `null` 반환
  - `getDateKey(parsedDate) === value`인지 다시 비교해 `2026-02-31` 같은 자동 보정 날짜 거부
  - 모든 검증을 통과하면 자정으로 정규화된 새 Date 반환

`new Date(value)`처럼 `YYYY-MM-DD` 문자열을 Date 생성자에 직접 전달하지 않는다.
브라우저가 UTC로 해석하면 타임존에 따라 전날로 표시될 수 있다.
지원 범위는 저장 계약과 날짜 이동 로직에서 같은 상수·함수를 사용해 일치시킨다.

### `src/utils/storage.js`

아래 함수들을 named export한다.

#### `loadTodosFromStorage()`

1. `TODOS_STORAGE_KEY` 값을 읽는다.
2. 저장값이 없으면 `[]`를 반환한다.
3. `JSON.parse`를 `try-catch` 안에서 실행한다.
4. 파싱 결과가 배열이 아니면 `[]`를 반환한다.
5. 숫자 id는 `Number.isSafeInteger`인지 확인하고 모든 유효한 id를 문자열로 정규화한다.
6. `MAX_TODO_LENGTH`를 사용해 trim된 text가 앱의 1~100자 규칙을 만족하는지 검사한다.
7. Todo의 date가 `parseDateKey(todo.date) !== null`인지 검사해 선택 가능한 날짜만 허용한다.
8. 내부 전용 검증 함수로 각 항목을 검사하고 유효한 Todo만 새 객체로 정규화한다.
9. `Set`으로 이미 복원한 `String(id)`를 추적하고 중복 ID는 제외한다.
10. 파싱·읽기 중 오류가 발생하면 `[]`를 반환한다.

검증 함수는 export하지 않는다. 현재 저장 데이터 계약을 판단하는 storage 모듈 내부 구현으로 둔다.

#### `saveTodosToStorage(todos)`

`JSON.stringify(todos)` 결과를 `TODOS_STORAGE_KEY`에 저장한다.
함수 내부에서 todos를 변경하거나 별도 상태를 관리하지 않는다.
직렬화와 `localStorage.setItem`을 모두 `try-catch` 안에서 실행한다.
둘 중 하나라도 예외를 던지면 예외를 App으로 전파하지 않는다.
반환값 계약은 두지 않는다.
저장 실패가 현재 메모리 state와 UI 동작을 중단시키면 안 된다.

#### `loadSelectedDateFromStorage()`

1. `SELECTED_DATE_STORAGE_KEY` 값을 읽는다.
2. `parseDateKey`로 복원한다.
3. 유효하면 해당 Date를 반환한다.
4. 값이 없거나 유효하지 않거나 읽기 오류가 발생하면 `createMidnightDate(new Date())`를 반환한다.

#### `saveSelectedDateToStorage(selectedDate)`

`getDateKey(selectedDate)` 결과를 `SELECTED_DATE_STORAGE_KEY`에 저장한다.
Date 객체 자체를 JSON으로 저장하지 않는다.
`localStorage.setItem`을 `try-catch` 안에서 실행한다.
예외 발생 시에도 Effect 밖으로 전파하지 않는다.
반환값 계약은 두지 않는다.

> 읽기 함수는 React state setter를 호출하거나 localStorage를 수정하지 않는다.
> lazy initializer가 `StrictMode`에서 반복 호출되어도 부작용이 없어야 한다.

### `src/App.jsx`

**import 수정**

- React import에 `useEffect` 추가
- `loadTodosFromStorage`, `saveTodosToStorage`, `loadSelectedDateFromStorage`, `saveSelectedDateToStorage` import
- `isSupportedDate` import

**state 초기화 수정**

```js
const [todos, setTodos] = useState(loadTodosFromStorage)
const [selectedDate, setSelectedDate] = useState(loadSelectedDateFromStorage)
```

함수 호출 결과를 넘기는 `useState(loadTodosFromStorage())`가 아니라 함수 자체를 넘긴다.
그래야 localStorage 읽기가 초기 렌더에서만 실행되고 이후 리렌더에서는 반복되지 않는다.

`editingId`, `filter` state 초기화 방식은 변경하지 않는다.

**저장 Effect 추가**

두 Effect는 App 컴포넌트 최상위에서 state 선언 뒤에 배치한다.
아래 순서는 읽기 쉬운 권장 배치이며, `todosForDate` useMemo와의 상대적인 순서가 동작 조건은 아니다.

```js
useEffect(() => {
  saveTodosToStorage(todos)
}, [todos])

useEffect(() => {
  saveSelectedDateToStorage(selectedDate)
}, [selectedDate])
```

- Todo 추가·수정·완료·삭제는 모두 `setTodos`로 새 배열을 만들기 때문에 `[todos]` Effect 하나로 저장된다.
- 날짜 이동은 새 Date 객체를 반환하므로 `[selectedDate]` Effect가 실행된다.
- Effect 안에서는 state를 다시 갱신하지 않는다.
- CRUD 핸들러와 `handleMoveDate`에는 localStorage 코드를 추가하지 않는다.

**날짜 이동 경계 처리**

`handleMoveDate`에서 다음 날짜 후보를 만든 뒤 `isSupportedDate(next)`를 검사한다.
지원 범위를 벗어나면 기존 `prev`를 그대로 반환해 이동을 no-op 처리하고,
유효한 경우에만 새 Date를 반환한다.
따라서 `1000-01-01`에서 이전 버튼, `9999-12-31`에서 다음 버튼을 눌러도
선택 날짜와 저장 날짜가 지원 범위를 벗어나지 않는다.

**의존성 배열 설명**

- `[todos]`: Effect가 사용하는 `todos`가 바뀔 때마다 다시 실행하기 위해 필요
- `[selectedDate]`: 선택 날짜 객체가 바뀔 때마다 다시 실행하기 위해 필요
- `[]`: 첫 마운트에만 실행되므로 이후 변경이 저장되지 않아 금지
- 의존성 배열 생략: 모든 렌더 뒤 실행되어 불필요한 저장이 발생하므로 금지

### `src/test/setup.js`

각 테스트가 끝날 때 React 트리를 정리한 뒤 이 앱이 소유한 localStorage 키만 제거한다.

```js
afterEach(() => {
  vi.restoreAllMocks()
  cleanup()
  localStorage.removeItem('my-tasks-todos')
  localStorage.removeItem('my-tasks-selected-date')
})
```

기존 cleanup용 `afterEach`와 별도의 훅을 중복 등록하지 말고 하나로 합친다.
테스트 내부에서 App을 언마운트하고 다시 마운트하는 경우에는 중간에 localStorage를 지우지 않는다.
setup에서는 상수 정의 자체가 잘못된 경우에도 공개 키 fixture가 남지 않도록 실제 공개 키 리터럴 두 개를 제거한다.
이 리터럴 사용은 테스트 격리를 위한 의도적인 예외다.
`vi`를 import하고 `restoreAllMocks`를 cleanup보다 먼저 호출해 테스트가 중간에 실패해도 mock이 누출되지 않게 한다.

### `src/App.test.jsx`

`waitFor`와 날짜 유틸을 필요한 범위에서 import한다.
파일 끝에 `describe('LocalStorage 지속성', ...)` 블록을 추가한다.

Effect는 렌더 commit 이후 실행되므로 localStorage 저장값을 단정할 때 `waitFor`를 사용한다.
저장 테스트와 복원 테스트는 서로 독립적으로 실패 원인을 드러내도록 분리한다.
localStorage 관련 테스트는 `<StrictMode><App /></StrictMode>` 형태로 렌더링해 실제 진입점과 같은 개발 모드 조건도 검증한다.

- **복원 테스트**는 공개 저장 계약을 검증하기 위해 정확한 키 리터럴(`'my-tasks-todos'`, `'my-tasks-selected-date'`)에 fixture를 직접 저장한다.
- **저장 테스트**도 UI 조작 후 정확한 키 리터럴의 원시 값을 읽는다.
- 상수 정의가 잘못된 경우까지 잡기 위해 이 테스트들에서는 storage key 상수를 import하지 않는다.
- round-trip 테스트는 개별 저장·복원 검증을 통과한 뒤 통합 흐름을 확인하는 용도로만 사용한다.
- `setItem` 호출 횟수는 검증하지 않는다. StrictMode에서는 마운트 Effect가 반복 실행될 수 있으므로 최종 저장값만 검증한다.
- 모든 `userEvent` 상호작용을 `await`하고, 저장 완료를 확인하기 전에 App을 언마운트하지 않는다.
- 날짜 이동 테스트는 클릭 직전 `<time>`의 `dateTime`을 `parseDateKey`로 변환한 뒤 하루를 더해 기대값을 계산한다.
- 저장 Todo 복원 테스트는 `my-tasks-selected-date`에 명시적인 날짜 fixture도 함께 저장해 실제 오늘 날짜에 의존하지 않는다.
- 오늘 폴백 테스트는 렌더 직전과 렌더 직후의 오늘 키를 각각 구하고, 실제 `<time>` 값이 둘 중 하나인지 확인한다. 테스트 도중 자정을 지나도 유효하다.

#### 필수 테스트

1. **저장된 Todo 초기 복원**
   - 명시적인 선택 날짜와 해당 날짜의 유효한 Todo 배열을 localStorage에 미리 저장
   - App 렌더
   - 저장된 Todo 텍스트와 완료 상태가 화면에 복원되는지 확인

2. **Todo 변경 자동 저장**
   - Todo 추가 후 `waitFor`로 저장된 배열 확인
   - `text`, `completed`, `date`가 현재 state와 일치하는지 확인
   - 저장된 `date`가 `/^\d{4}-\d{2}-\d{2}$/` 형식인지 확인

3. **Todo 수정·완료·삭제 자동 저장**
   - Todo 완료 토글 후 저장된 `completed`가 `true`인지 확인
   - Todo 편집 저장 후 저장된 `text`가 변경되었는지 확인
   - Todo 삭제 후 저장 배열에서 해당 항목이 제거되었는지 확인
   - 각 UI 조작 뒤 저장 Effect 완료를 `waitFor`로 확인

4. **언마운트 후 Todo 복원**
   - App에서 Todo 추가
   - localStorage 저장 완료를 `waitFor`로 확인
   - `unmount()` 후 App 재렌더
   - Todo가 다시 표시되는지 확인

5. **선택 날짜 저장·복원**
   - 다음 날짜 버튼 클릭
   - `<time>`의 `dateTime`과 localStorage 값이 같은지 `waitFor`로 확인
   - App을 언마운트 후 재렌더
   - 같은 날짜가 선택되어 있는지 확인

6. **손상된 Todo JSON 폴백**
   - `my-tasks-todos`에 `invalid json` 저장
   - App 렌더가 예외 없이 완료되고 빈 상태가 표시되는지 확인
   - 마운트 Effect 실행 후 저장값이 `[]`로 정규화되는지 확인

7. **배열이 아닌 Todo JSON 폴백**
   - 유효한 JSON이지만 배열이 아닌 `null`, 문자열, `{}`를 각각 저장
   - 각 경우 App이 빈 목록으로 동작하는지 fixture 순회 방식으로 확인

8. **일부 잘못된 Todo 제거**
   - 유효한 Todo와 `id`·`text`·`completed`·`date`가 각각 잘못된 Todo, 안전 정수 범위를 벗어난 숫자 ID, 100자를 초과한 Todo, 지원 연도 범위 밖 date, 중복 ID Todo를 함께 저장
   - 숫자 `1`과 문자열 `'1'`도 중복 ID fixture에 포함
   - 유효하고 ID가 처음 등장한 Todo만 화면과 정규화된 저장값에 남는지 확인

9. **잘못된 선택 날짜 폴백**
   - `2026-02-31`을 선택 날짜 키에 저장
   - 렌더 직전과 직후의 오늘 키를 구해 `<time>`의 `dateTime`이 둘 중 하나인지 확인
   - `waitFor`로 localStorage의 선택 날짜 키도 같은 오늘 키로 자동 교정됐는지 확인

10. **localStorage 쓰기 실패 허용**
   - `Storage.prototype.setItem`이 예외를 던지도록 mock
   - App 렌더와 Todo 추가 UI가 중단되지 않는지 확인
   - 전역 `afterEach`의 `vi.restoreAllMocks()`가 mock을 복원하는지 전제로 한다

11. **선택 날짜와 Todo 복원 통합**
   - 서로 다른 두 날짜의 Todo와 두 날짜 중 하나를 선택 날짜로 직접 저장
   - App 렌더 후 선택된 날짜의 Todo만 표시되고 다른 날짜 Todo는 표시되지 않는지 확인

12. **localStorage 읽기 실패 폴백**
   - `Storage.prototype.getItem`이 예외를 던지도록 mock
   - App이 빈 Todo 목록과 오늘 날짜로 예외 없이 렌더링되는지 확인
   - 전역 `afterEach`의 `vi.restoreAllMocks()`가 mock을 복원하는지 전제로 한다

13. **지원 날짜 경계**
   - 선택 날짜를 `1000-01-01`로 저장해 렌더한 뒤 이전 버튼을 클릭해도 날짜가 유지되는지 확인
   - 선택 날짜를 `9999-12-31`로 저장해 렌더한 뒤 다음 버튼을 클릭해도 날짜가 유지되는지 확인
   - 두 경우 localStorage에도 지원 범위 밖 날짜가 저장되지 않는지 확인

현재 존재하는 16개 회귀 테스트를 포함해 전체 테스트 스위트가 통과해야 한다.

---

## 학습 확인 질문

### `useEffect`의 의존성 배열에 무엇이 들어가며, 왜 필요한가?

- Todo 저장 Effect에는 `todos`가 들어간다. Todo 배열 참조가 변경된 commit 이후 최신 배열을 저장하기 위해서다.
- 선택 날짜 저장 Effect에는 `selectedDate`가 들어간다. 날짜 이동으로 새 Date 객체가 설정된 commit 이후 최신 날짜를 저장하기 위해서다.
- `[]`를 사용하면 최초 마운트 후에만 실행되어 이후 상태 변경을 저장하지 못한다.
- 의존성 배열을 생략하면 모든 렌더 뒤에 실행되어 불필요한 저장이 발생한다.
- React가 참조 변경을 감지할 수 있도록 기존 배열·객체를 직접 수정하지 않고 항상 새 값으로 교체해야 한다.

### lazy initializer에 함수를 전달하는 이유는 무엇인가?

- `useState(loadTodosFromStorage)`처럼 함수를 전달하면 리렌더마다 storage를 읽지 않는다.
- `useState(loadTodosFromStorage())`는 컴포넌트 함수가 실행될 때마다 읽기 함수를 먼저 호출하므로 lazy initialization의 이점을 잃는다.
- 개발 환경의 `StrictMode`는 순수성 검증을 위해 initializer를 반복 호출할 수 있으므로 정확한 호출 횟수에 의존하지 않는다.

### `JSON.stringify`와 `JSON.parse`가 각각 필요한 이유는 무엇인가?

- localStorage는 문자열만 저장하므로 배열·객체를 저장할 때 `JSON.stringify`로 문자열화한다.
- 읽은 문자열을 Todo 배열로 사용하려면 `JSON.parse`가 필요하다.
- `JSON.parse` 성공만으로 데이터 구조가 올바르다고 보장할 수 없으므로 배열과 각 Todo 필드를 추가 검증한다.

---

## 구현 순서

1. storage key 상수 추가
2. 지원 날짜 상수·`isSupportedDate`·`parseDateKey` 추가
3. storage 읽기·검증·쓰기 함수 추가
4. App state를 lazy initializer로 교체
5. App에 저장 Effect 두 개 추가
6. 테스트 setup에서 localStorage 격리
7. 지속성·오류 복구 테스트 추가
8. 전체 테스트·lint·build 실행
9. 브라우저 개발자 도구에서 실제 저장값과 새로고침 복원 확인

---

## 검증 포인트

- [ ] Todo 추가 후 `my-tasks-todos`에 JSON 배열이 저장됨
- [ ] Todo 수정·완료 토글·삭제 후에도 최신 배열로 자동 갱신됨
- [ ] 새로고침 또는 App 재마운트 후 Todo가 유지됨
- [ ] 날짜 이동 후 `my-tasks-selected-date`에 `YYYY-MM-DD` 문자열이 저장됨
- [ ] 새로고침 또는 App 재마운트 후 마지막 선택 날짜가 복원됨
- [ ] 복원된 선택 날짜에 해당하는 Todo만 표시됨
- [ ] 손상된 JSON, 배열이 아닌 JSON, 잘못된 Todo 항목 때문에 앱이 중단되지 않음
- [ ] 숫자·문자열 표현이 같아지는 중복 ID도 첫 항목만 유지되어 React key와 CRUD 대상이 충돌하지 않음
- [ ] 잘못된 선택 날짜는 오늘 날짜로 폴백됨
- [ ] 지원 날짜 경계 밖 이동은 no-op 처리되고 범위 밖 날짜가 저장되지 않음
- [ ] localStorage 읽기 실패 시 빈 Todo와 오늘 날짜로 정상 렌더링됨
- [ ] localStorage 쓰기 실패 시에도 현재 세션의 UI와 메모리 state는 정상 동작함
- [ ] 필터·편집 상태·입력 중 텍스트는 새로고침 후 초기값으로 돌아감
- [ ] 개발자 도구 F12 → Application → Local Storage에서 두 키와 실제 값 확인
- [ ] 현재 16개 회귀 테스트와 신규 localStorage 테스트를 포함한 전체 테스트 스위트가 통과함
- [ ] `npm test -- --run`, `npm run lint`, `npm run build` 통과

---

## 금지 사항

- CRUD·날짜 이동 핸들러에서 `localStorage.setItem` 직접 호출 금지
- `useEffect` 의존성 배열을 `[]`로 설정하거나 생략 금지
- 렌더링 본문에서 localStorage 읽기·쓰기 금지
- `useState(loadTodosFromStorage())`처럼 initializer를 즉시 호출해 전달 금지
- `JSON.parse` 결과를 배열·필드 검증 없이 state로 사용 금지
- `new Date('YYYY-MM-DD')` 방식으로 저장 날짜 파싱 금지
- Date 객체 자체를 JSON 직렬화해 선택 날짜로 저장 금지
- 프로덕션 코드에서 storage key 문자열을 여러 파일에 하드코딩 금지
- 공개 저장 계약을 독립 검증하는 테스트에서는 정확한 key 리터럴 사용 허용
- localStorage에서 읽은 Todo 객체를 직접 수정해 정규화 금지
- `filter`, `editingId`, 입력 draft를 이번 단계에서 추가 저장 금지
- 테스트마다 앱 소유 localStorage 키를 제거하지 않은 채 지속성 테스트 추가 금지
