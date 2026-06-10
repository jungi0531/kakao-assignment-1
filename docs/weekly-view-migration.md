# Todo 주간 뷰 마이그레이션 프롬프트

## 구현 목표

현재의 하루 단위 `DateNavigator`를 월요일부터 일요일까지 7일을 보여주는 주간 뷰로 교체한다.

주간 뷰에서 날짜를 선택하면 기존 `selectedDate`가 해당 날짜로 변경되고,
Todo 입력·목록·필터는 지금처럼 선택 날짜를 기준으로 동작해야 한다.
이전 주 / 다음 주 이동 시 표시 날짜와 날짜별 Todo 개수가 함께 갱신되며,
새로고침하거나 App을 다시 마운트해도 마지막으로 보고 있던 주차를 복원한다.

참고 소스:

- `../kakao-assignment-1/app.js`
  - 상태: `selectedDate`, `weekStartDate`
  - 날짜 유틸: `getWeekStart`, `getWeekDates`, `isCurrentWeek`, `formatWeekRange`
  - 주간 뷰: `renderWeekView`, `createWeekDayCell`, `selectDate`, `moveWeek`
  - 저장: `WEEK_START_KEY`, `saveWeekStart`, `loadWeekStart`
- `../kakao-assignment-1/index.html`의 `.week-nav`
- `../kakao-assignment-1/style.css`의 주간 뷰 스타일

---

## 현재 React 앱 기준

이 단계는 아래 기능이 이미 구현된 상태를 기준으로 한다.

- `todos`와 `selectedDate`는 `App`이 소유한다.
- `selectedDate`는 항상 유효한 `Date`이며 `null`을 사용하지 않는다.
- `todosForDate`는 `selectedDate`에 해당하는 Todo만 파생한다.
- 새 Todo의 `date`에는 `getDateKey(selectedDate)`가 저장된다.
- Todo와 선택 날짜는 각각 `my-tasks-todos`, `my-tasks-selected-date`에 저장된다.
- 저장 데이터의 지원 날짜 범위는 `1000-01-01`부터 `9999-12-31`까지다.
- `filter`, `editingId`, 입력 draft는 일시적인 UI 상태로 유지한다.
- 현재 `App.test.jsx`의 33개 회귀 테스트가 통과한다.

주간 뷰 구현 과정에서 위 계약을 깨거나 Todo 저장 형식을 변경하지 않는다.

`docs/localstorage-migration.md`에서 `my-tasks-week-start` 복원을 제외한 것은
이전 localStorage 단계의 범위 정의다.
이번 문서는 그 제외 항목을 후속 단계에서 추가하는 명세이며,
Todo와 선택 날짜 저장 계약은 그대로 유지한다.

---

## 이번 단계 범위

**포함**

- 월요일부터 일요일까지 7개 날짜 표시
- 표시 주간의 날짜 범위 출력
- 날짜 선택과 기존 일간 Todo 목록 연결
- 이전 주 / 다음 주 이동
- 날짜별 전체 Todo 개수 표시
- 오늘 날짜와 선택 날짜의 시각적 구분
- `weekStartDate`의 `useState` 관리
- `weekStartDate` localStorage 저장·복원
- 손상된 주간 저장값의 폴백과 자동 교정
- 기존 선택 날짜 저장과 주간 저장값의 일관성 유지
- 지원 날짜 경계에서 범위 밖 날짜 선택 방지
- 주간 뷰 관련 자동화 테스트

**제외**

- 월간 달력 뷰
- 사용자가 주 시작 요일을 변경하는 설정
- 여러 주를 한 번에 표시하는 기능
- 드래그로 Todo 날짜를 변경하는 기능
- 여러 탭 사이의 `storage` 이벤트 동기화
- 자정이 되었을 때 자동으로 오늘 표시를 갱신하는 타이머
- 사진의 요구사항에 없는 "이번 주로 이동" 바로가기 버튼
- 날짜별 완료율·진행률 등 Todo 개수 외 통계

---

## 핵심 상태 설계

### 상태별 책임

| 상태 | 책임 |
|------|------|
| `selectedDate` | 실제 Todo 입력·조회 대상 날짜 |
| `weekStartDate` | 주간 뷰 첫 번째 칸에 표시할 월요일 |
| `todos` | 전체 날짜의 Todo 원본 배열 |
| `filter` | 선택 날짜 Todo에 적용할 상태 필터 |

`selectedDate`와 `weekStartDate`는 서로 다른 책임을 가지므로 둘 다 `useState`로 관리한다.
단, 두 상태가 서로 다른 주를 가리키면 선택 표시와 Todo 목록이 불일치하므로 아래 불변식을 유지한다.

```text
weekStartDate는 표시 주의 월요일이다.
selectedDate는 weekStartDate부터 6일 사이에 포함된다.
selectedDate는 항상 기존 지원 범위 안의 실제 날짜다.
```

### 상태 연결 규칙

**날짜 셀 선택**

- `weekStartDate`는 변경하지 않는다.
- `selectedDate`를 클릭한 날짜의 자정으로 변경한다.
- 편집 중인 Todo가 다른 날짜로 넘어가지 않도록 `editingId`를 초기화한다.
- 필터는 유지한다.

**이전 주 / 다음 주 이동**

- `weekStartDate`를 각각 `-7일`, `+7일` 이동한다.
- `selectedDate`도 같은 방향으로 7일 이동한다.
- 따라서 선택한 요일이 다음 주에도 유지된다.
- 두 후보 날짜를 먼저 계산하고, 지원 범위를 통과할 때만 두 state를 함께 갱신한다.
- 하나만 먼저 갱신해 두 날짜 state가 불일치하는 중간 상태를 만들지 않는다.
- 편집 상태는 초기화하고 필터는 유지한다.

예를 들어 수요일이 선택된 상태에서 다음 주 버튼을 누르면,
다음 주 수요일이 새 `selectedDate`가 된다.
주간 셀의 선택 표시와 Todo 목록은 항상 같은 날짜를 가리킨다.

> 1차 과제의 `moveWeek`는 주 이동 시 `selectedDate = null`로 초기화했다.
> 현재 React 앱은 선택 날짜가 항상 존재한다는 계약으로 Todo 입력과 목록을 구성하므로
> 해당 동작을 그대로 이식하지 않는다.

---

## 1차 과제와의 핵심 차이

| 항목 | 1차 과제 (Vanilla JS) | 2차 과제 (React) |
|------|----------------------|-----------------|
| 주간 상태 | 모듈 변수 `weekStartDate` | `useState` |
| 날짜 셀 생성 | `createElement`와 `appendChild` | 배열을 JSX로 렌더링 |
| 주간 렌더링 | `renderWeekView()` 직접 호출 | state 변경 후 자동 리렌더 |
| 날짜 선택 | 전역 `selectedDate` 대입 | `setSelectedDate` |
| 주 이동 | `weekStartDate` 변경 후 선택 해제 | 주 시작일과 선택 날짜를 모두 7일 이동 |
| 날짜별 개수 | 셀 생성 시 `getTodosForDate` 호출 | `todos`에서 `useMemo`로 개수 맵 파생 |
| 선택 스타일 | `classList`와 `is-selected` | `aria-pressed`와 조건부 Tailwind 클래스 |
| 주간 저장 | 이벤트 함수에서 직접 저장 | `useEffect([weekStartDate])` |
| 복원 | 초기화 구문에서 명령형 호출 | `useState` lazy initializer |
| 잘못된 저장값 | 검증 없이 복원 | 형식·달력 날짜·월요일·선택 날짜 포함 여부 검증 |

---

## 상태 생명주기

```text
첫 마운트
  selectedDate 복원
    → 기존 my-tasks-selected-date 검증
  weekStartDate 복원
    → my-tasks-week-start 검증
    → 선택 날짜를 포함하는 월요일인지 확인
    → 잘못되었으면 getWeekStart(selectedDate)로 폴백
  화면 렌더링
    → 표시 주간 7일 계산
    → 날짜별 Todo 개수 계산
  Effect 실행
    → 정규화된 selectedDate와 weekStartDate를 각각 저장

날짜 셀 클릭
  setEditingId(null)
  setSelectedDate(clickedDate)
    → Todo 목록과 선택 셀 갱신
    → selectedDate 저장 Effect 실행

주차 이동
  nextWeekStart = weekStartDate ± 7일
  nextSelectedDate = selectedDate ± 7일
    → 두 후보가 유효하면 state 두 개 갱신
    → 날짜 목록·Todo 개수·선택 날짜 Todo 갱신
    → selectedDate와 weekStartDate 저장 Effect 실행

Todo CRUD
  todos 변경
    → 날짜별 Todo 개수 맵 재계산
    → 기존 Todo 저장 Effect 실행
```

---

## 저장 데이터 계약

### `my-tasks-week-start`

```text
2026-06-08
```

- 표시 주간의 월요일을 저장한다.
- Date 객체를 JSON으로 저장하지 않고 날짜 키 문자열만 저장한다.
- 일반적인 저장값은 기존 `parseDateKey`가 허용하는 `1000`~`9999` 연도 범위다.
- 복원한 날짜는 실제 달력 날짜이며 월요일이어야 한다.
- 복원한 주간은 복원된 `selectedDate`를 포함해야 한다.
- 저장값이 없거나 잘못되었거나 선택 날짜와 불일치하면 `getWeekStart(selectedDate)`로 폴백한다.
- 마운트 Effect가 폴백 결과를 다시 저장해 손상된 값을 자동 교정한다.

### 기존 저장값과의 일관성

정상적인 사용자 동작에서는 `selectedDate`와 `weekStartDate`가 항상 같은 주를 가리킨다.
하지만 개발자 도구 수정, 이전 버전 데이터, 일부 쓰기 실패로 두 키가 불일치할 수 있다.

복원 시에는 기존 Todo 동작을 직접 결정하는 `selectedDate`를 기준값으로 사용한다.
저장된 주 시작일이 `selectedDate`를 포함하지 않으면 주 시작 저장값을 버리고
`getWeekStart(selectedDate)`를 사용한다.

이 규칙으로 선택 셀 없이 다른 날짜의 Todo가 표시되는 상태를 방지한다.

### 지원 날짜 경계

기존 앱은 선택 가능한 날짜를 `1000-01-01`부터 `9999-12-31`까지 지원한다.
해당 경계 날짜가 속한 주는 일부 날짜가 지원 범위 밖에 있을 수 있다.

- `getWeekStart`는 달력상의 실제 월요일을 반환한다.
- `getDateKey`의 연도는 최소 4자리로 패딩한다.
  - 기존 지원 범위의 결과는 변하지 않는다.
  - 예: 경계 주의 월요일이 999년이면 `0999-12-30` 형태가 된다.
- 주 시작 저장값은 최소 날짜 또는 최대 날짜와 겹치는 경계 주까지 표현할 수 있어야 한다.
- 주간 셀 중 `isSupportedDate(date) === false`인 날짜는 disabled 처리한다.
- 지원 범위 밖 셀에는 Todo 개수를 표시하지 않고 선택 이벤트를 실행하지 않는다.
- 지원 범위 밖 셀의 접근성 이름에는 Todo 개수 대신 "지원 범위 밖" 상태를 포함한다.
- 주차 이동 후의 `nextSelectedDate`가 지원 범위를 벗어나면 이동 전체를 no-op 처리한다.

주 시작 저장값을 검증할 때 기존 `parseDateKey`의 선택 날짜 계약을 억지로 완화하지 않는다.
주 시작일 전용 파서에서 아래 조건을 별도로 확인한다.

- 4자리 연도 날짜 키
- 실제 달력 날짜
- 월요일
- 계산된 7일 중 하나 이상이 기존 지원 날짜 범위와 겹침

Todo의 `date`와 `my-tasks-selected-date`는 계속 기존 `parseDateKey` 계약을 따른다.

---

## 1차 과제 참고 로직 매핑

| 1차 과제 함수/변수 | React 대응 |
|---|---|
| `weekStartDate` | `const [weekStartDate, setWeekStartDate] = useState(...)` |
| `getWeekStart(date)` | `src/utils/date.js`의 동명 함수 |
| `getWeekDates(weekStart)` | `src/utils/date.js`의 동명 함수 |
| `formatWeekRange(start, end)` | `src/utils/date.js`의 동명 함수 |
| `renderWeekView()` | `WeekNavigator` 렌더링 |
| `createWeekDayCell(date)` | `weekDates.map()`의 날짜 버튼 JSX |
| `selectDate(date)` | `handleSelectDate(date)` |
| `moveWeek(delta)` | `handleMoveWeek(delta)` |
| `getTodosForDate(dateKey).length` | `todoCountByDate[dateKey] ?? 0` |
| `WEEK_START_KEY` | `WEEK_START_STORAGE_KEY` |
| `saveWeekStart()` | `useEffect(() => saveWeekStartDateToStorage(weekStartDate), [weekStartDate])` |
| `loadWeekStart()` | `useState` lazy initializer |

---

## 수정 대상 파일

| 파일 | 작업 |
|------|------|
| `src/constants/storage.js` | `WEEK_START_STORAGE_KEY` 추가 |
| `src/utils/date.js` | 주 시작·7일 배열·날짜 범위·주 시작 검증 유틸 추가 |
| `src/utils/storage.js` | 주 시작 날짜 읽기·쓰기 함수 추가 |
| `src/components/WeekNavigator.jsx` | 신규 생성 — 주간 헤더와 날짜 셀 렌더링 |
| `src/components/DateNavigator.jsx` | 삭제 — 주간 뷰로 완전히 교체 |
| `src/App.jsx` | `weekStartDate`, 주간 이동·날짜 선택, Todo 개수 맵, 저장 Effect 연결 |
| `src/test/setup.js` | `my-tasks-week-start` 테스트 격리 추가 |
| `src/App.test.jsx` | 기존 날짜 네비게이터 테스트 수정 및 주간 뷰 테스트 추가 |

`TodoInput`, `TodoFilter`, `TodoList`, `TodoItem`은 변경하지 않는다.
주간 뷰는 `App`이 소유한 상태와 파생값을 props로 받아 표시하는 컴포넌트로 구현한다.

---

## 구현 명세

### `src/constants/storage.js`

아래 named export를 추가한다.

```js
export const WEEK_START_STORAGE_KEY = 'my-tasks-week-start'
```

프로덕션 코드의 다른 파일에 키 문자열을 다시 하드코딩하지 않는다.
1차 과제와 동일한 실제 키를 사용해 같은 origin에서 저장 계약을 유지한다.

---

### `src/utils/date.js`

기존 함수의 동작을 보존하면서 아래 항목을 추가한다.

#### `getDateKey(date)` 보강

연도를 최소 4자리로 패딩한다.

```js
const year = String(date.getFullYear()).padStart(4, '0')
```

`1000`~`9999` 범위의 기존 결과는 동일하다.
이 변경은 최소 지원 날짜가 포함된 경계 주의 월요일을 주 시작 키로 표현하기 위해 필요하다.

#### `getWeekStart(date)`

- 입력 Date를 직접 수정하지 않는다.
- `createMidnightDate(date)`로 복사·정규화한다.
- 일요일은 6일 전, 나머지는 `getDay() - 1`일 전으로 이동한다.
- 해당 날짜가 속한 주의 월요일 자정을 반환한다.

#### `getWeekDates(weekStartDate)`

- `weekStartDate`를 직접 수정하지 않는다.
- 월요일부터 일요일까지 7개의 새 Date 객체를 반환한다.
- 반환 배열이나 Date 객체를 state 원본 대신 직접 수정하지 않는다.

#### `isDateInWeek(date, weekStartDate)`

- `date`와 `weekStartDate`를 각각 자정으로 정규화한 timestamp로 비교한다.
- `weekStartDate` 이상이고 6일 뒤 이하이면 `true`를 반환한다.
- 복원된 두 날짜 state의 일관성 검증에 사용한다.

문자열 날짜 키의 사전식 비교는 사용하지 않는다.
경계 주에서 `9999-12-31`과 `10000-01-01`처럼 연도 자릿수가 달라지면
문자열 정렬 순서와 실제 시간 순서가 달라질 수 있기 때문이다.

#### `formatWeekRange(startDate, endDate)`

표시 주간 범위를 반환한다.

- 같은 현재 연도: `6월 8일 – 6월 14일`
- 같은 비현재 연도: `2027년 6월 8일 – 6월 14일`
- 서로 다른 연도: `2026년 12월 28일 – 2027년 1월 3일`

연도 경계를 넘는 경우 양쪽 연도를 모두 표시해 범위가 모호하지 않게 한다.

#### `isSupportedWeekStart(date)`

- 유효한 Date인지 확인한다.
- 월요일인지 확인한다.
- `getWeekDates(date)` 중 하나 이상이 `isSupportedDate`를 만족하는지 확인한다.
- 경계 주차를 제외한 완전히 지원 범위 밖의 주는 거부한다.

#### `parseWeekStartKey(value)`

- 문자열이 아니면 `null`을 반환한다.
- 정확한 4자리 연도와 `MM-DD` 형식인지 확인한다.
- 연·월·일을 분리해 로컬 Date로 생성한다.
- 생성 결과를 날짜 키와 다시 비교해 `2026-02-31` 같은 자동 보정을 거부한다.
- `isSupportedWeekStart`가 false면 `null`을 반환한다.
- 모든 검증을 통과하면 자정으로 정규화된 새 Date를 반환한다.

선택 날짜와 Todo 날짜에 사용하는 `parseDateKey`의 `1000`~`9999` 계약은 변경하지 않는다.

---

### `src/utils/storage.js`

아래 named export를 추가한다.

#### `loadWeekStartDateFromStorage(selectedDate)`

1. `WEEK_START_STORAGE_KEY` 값을 읽는다.
2. `parseWeekStartKey`로 파싱한다.
3. 파싱 결과가 유효하고 `isDateInWeek(selectedDate, storedWeekStart)`가 true면 반환한다.
4. 값이 없거나 손상되었거나 선택 날짜와 다른 주를 가리키면 `getWeekStart(selectedDate)`를 반환한다.
5. `localStorage.getItem`이 예외를 던져도 동일하게 선택 날짜의 주로 폴백한다.
6. localStorage를 수정하거나 React state setter를 호출하지 않는다.

이 함수는 `selectedDate`를 명시적으로 인수로 받는다.
storage 모듈이 다른 저장 함수를 내부에서 다시 호출해 같은 키를 중복으로 읽지 않도록 한다.

#### `saveWeekStartDateToStorage(weekStartDate)`

- `getDateKey(weekStartDate)` 결과를 `WEEK_START_STORAGE_KEY`에 저장한다.
- `localStorage.setItem`을 `try-catch` 안에서 실행한다.
- 쓰기 실패를 App으로 전파하지 않는다.
- Date 객체나 별도 상태를 수정하지 않는다.
- 반환값 계약을 두지 않는다.

---

### `src/components/WeekNavigator.jsx`

아래 props를 받는다.

| prop | 타입 | 역할 |
|------|------|------|
| `weekStartDate` | `Date` | 표시 주간의 월요일 |
| `selectedDate` | `Date` | 현재 Todo 조회 대상 날짜 |
| `todoCountByDate` | object | 날짜 키별 전체 Todo 개수 |
| `onSelectDate` | function | 지원되는 날짜 셀 선택 |
| `onPrevWeek` | function | 이전 주 이동 |
| `onNextWeek` | function | 다음 주 이동 |

컴포넌트 내부에서 `getWeekDates(weekStartDate)`로 7개 날짜를 계산한다.
이 값은 계산 비용이 매우 작고 props에서 직접 결정되므로 별도 state로 저장하지 않는다.
필요하면 `useMemo([weekStartDate])`를 사용할 수 있지만 필수는 아니다.

#### 루트 구조

- `<section aria-label="주간 뷰">`
- 헤더: 이전 주 버튼, 주간 범위, 다음 주 버튼
- 날짜 목록: 7열 grid

#### 헤더

- 이전 버튼: `aria-label="이전 주"`, `onPrevWeek` 호출
- 범위 텍스트: `formatWeekRange(weekDates[0], weekDates[6])`
- 범위 텍스트에는 `aria-live="polite"`를 적용해 주차 이동 결과를 전달한다.
- 다음 버튼: `aria-label="다음 주"`, `onNextWeek` 호출

#### 날짜 셀

각 날짜는 `<button type="button">`으로 렌더링한다.

- React `key`: `getDateKey(date)`
- 요일: 기존 `DAY_LABELS[date.getDay()]`
- 날짜 숫자: `date.getDate()`
- `aria-pressed`: 선택 날짜 여부
- `aria-label`: 연·월·일, 요일, Todo 개수를 포함
- 클릭: `onSelectDate(date)`
- 지원 범위 밖 날짜: `disabled`

예시 접근성 이름:

```text
2026년 6월 10일 수요일, 할 일 3개
```

날짜 요소에는 기계가 읽을 수 있는 날짜 키를 제공한다.
테스트에서는 화면 텍스트를 조합해 추측하지 않고 날짜 셀의 `<time dateTime>`을 기준으로 날짜를 확인한다.

#### Todo 개수

- `todoCountByDate[dateKey] ?? 0`으로 읽는다.
- `filter` 적용 전의 전체 Todo 개수를 표시한다.
- 완료 여부와 관계없이 해당 날짜에 속한 모든 Todo를 센다.
- 0개일 때는 빈 공간을 유지해 셀 높이가 흔들리지 않게 한다.
- 스크린리더용 `aria-label`에는 0개도 명시한다.

#### 스타일

Tailwind 인라인 유틸리티로 작성하고 기존 디자인 토큰을 사용한다.

- 기본 셀: surface 배경과 text 색상
- hover: `bg-primary-bg`, `text-primary`
- 오늘: primary 계열 텍스트 또는 뱃지로 구분
- 선택 날짜: `bg-primary text-white`
- 오늘이면서 선택됨: 선택 배경 안에서 오늘 뱃지가 읽히도록 색상 반전
- disabled 경계 셀: `opacity-30`, `cursor-not-allowed`
- 7열 grid는 작은 화면에서도 유지하되 패딩과 글자 크기를 `max-[480px]:`로 축소한다.
- 키보드 사용자를 위해 날짜 버튼과 주 이동 버튼에 `focus-visible` 스타일을 제공한다.

선택 상태는 색상만으로 전달하지 않고 `aria-pressed`도 함께 사용한다.

---

### `src/App.jsx`

#### import 수정

- `DateNavigator` import 제거
- `WeekNavigator` import 추가
- 날짜 유틸에서 `getWeekStart`, 필요한 날짜 복사·검증 함수 import
- storage 유틸에서 주 시작 읽기·쓰기 함수 import

#### state 추가

`selectedDate` 선언 다음에 `weekStartDate`를 선언한다.

```js
const [selectedDate, setSelectedDate] = useState(loadSelectedDateFromStorage)
const [weekStartDate, setWeekStartDate] = useState(() =>
  loadWeekStartDateFromStorage(selectedDate),
)
```

- 두 번째 initializer도 lazy initializer다.
- 복원된 `selectedDate`를 폴백 기준으로 전달한다.
- initializer 안에서 state를 갱신하거나 localStorage에 쓰지 않는다.

#### 저장 Effect 추가

```js
useEffect(() => {
  saveWeekStartDateToStorage(weekStartDate)
}, [weekStartDate])
```

- 기존 Todo·선택 날짜 Effect와 같은 위치에 둔다.
- CRUD, 날짜 선택, 주 이동 핸들러에서 storage 함수를 직접 호출하지 않는다.
- StrictMode에서 반복 실행되어도 동일한 키에 동일한 값을 쓰는 멱등 동작이어야 한다.

#### 날짜별 Todo 개수 파생

`todos` 전체에서 날짜별 개수를 한 번 계산한다.

```js
const todoCountByDate = useMemo(() => {
  return todos.reduce((counts, todo) => {
    counts[todo.date] = (counts[todo.date] ?? 0) + 1
    return counts
  }, {})
}, [todos])
```

- `todosForDate`나 `filteredTodos`를 기준으로 계산하지 않는다.
- 현재 선택 날짜와 현재 필터에 관계없이 표시 주간의 모든 날짜 개수가 필요하다.
- 파생값이므로 `useState`에 저장하지 않는다.
- reducer는 새 빈 객체를 만들고 Todo 원본을 수정하지 않는다.

#### `handleSelectDate(date)`

- 지원 범위 밖 날짜면 아무 작업도 하지 않는다.
- 현재 표시 주간에 포함되지 않은 날짜면 아무 작업도 하지 않는다.
- `setEditingId(null)`로 편집 상태를 종료한다.
- `createMidnightDate(date)`로 복사한 새 Date를 `selectedDate`에 설정한다.
- `weekStartDate`와 `filter`는 변경하지 않는다.

#### `handleMoveWeek(delta)`

`delta`는 `-7` 또는 `7`만 전달한다.

1. 현재 `weekStartDate`를 복사해 `delta`일 이동한 `nextWeekStart`를 만든다.
2. 현재 `selectedDate`를 복사해 `delta`일 이동한 `nextSelectedDate`를 만든다.
3. `nextSelectedDate`가 `isSupportedDate`를 만족하는지 확인한다.
4. `nextWeekStart`가 `isSupportedWeekStart`를 만족하는지 확인한다.
5. 둘 중 하나라도 실패하면 state를 변경하지 않는다.
6. 둘 다 유효하면 편집 상태를 초기화하고 두 state를 갱신한다.
7. 필터는 유지한다.

두 `setState`는 같은 이벤트 안에서 실행되므로 React가 배치 처리한다.
한 state updater 안에서 다른 state setter를 호출하지 않는다.

#### JSX 교체

기존 `DateNavigator`를 제거하고 같은 위치에 아래 props의 `WeekNavigator`를 렌더링한다.

```jsx
<WeekNavigator
  weekStartDate={weekStartDate}
  selectedDate={selectedDate}
  todoCountByDate={todoCountByDate}
  onSelectDate={handleSelectDate}
  onPrevWeek={() => handleMoveWeek(-7)}
  onNextWeek={() => handleMoveWeek(7)}
/>
```

`TodoInput`, `TodoFilter`, `TodoList`의 순서와 기존 Todo 파생 로직은 유지한다.

---

### `src/test/setup.js`

기존 `afterEach`에서 앱 소유 주간 키도 제거한다.

```js
afterEach(() => {
  vi.restoreAllMocks()
  cleanup()
  localStorage.removeItem('my-tasks-todos')
  localStorage.removeItem('my-tasks-selected-date')
  localStorage.removeItem('my-tasks-week-start')
})
```

공개 저장 키 자체가 잘못 정의된 경우도 테스트 격리에서 발견할 수 있도록
setup에서는 실제 키 리터럴 사용을 유지한다.

---

### `src/App.test.jsx`

기존 테스트가 일간 `DateNavigator` 구조와 버튼 이름에 의존하는 부분을 주간 뷰 기준으로 수정한다.

#### 테스트 조회 원칙

- 선택 날짜는 단일 전역 `<time>`을 가정하지 않는다.
- `aria-pressed="true"`인 날짜 버튼 내부의 `<time dateTime>`으로 선택 날짜를 확인한다.
- 날짜 버튼은 접근성 이름 또는 `dateTime`을 통해 찾는다.
- 스타일만 검사하지 않고 `aria-pressed`, `disabled`, 실제 Todo 목록을 함께 확인한다.
- localStorage 최종값은 Effect 이후 `waitFor`로 확인한다.
- 저장 계약 테스트에서는 상수를 import하지 않고 정확한 공개 키 리터럴을 사용한다.
- localStorage 테스트는 기존과 동일하게 `<StrictMode><App /></StrictMode>`로 렌더링한다.
- `setItem` 호출 횟수는 단정하지 않는다.

#### 기존 테스트 수정

- `"이전 날짜"`, `"다음 날짜"` 버튼 조회를 제거한다.
- 선택 날짜 저장·복원 테스트는 명시적인 주간 fixture를 저장하고 다른 날짜 셀을 클릭한다.
- 지원 날짜 경계 테스트는 범위 밖 날짜 셀의 disabled 상태와 주차 이동 no-op을 검증한다.
- `getSelectedDateKey` 테스트 helper는 선택된 날짜 버튼을 기준으로 구현한다.

#### 필수 신규 테스트

1. **현재 주간 7일 렌더링**
   - 명시적인 선택 날짜와 주 시작일 fixture 저장
   - 월요일부터 일요일까지 정확히 7개 날짜가 순서대로 표시되는지 확인
   - 선택 날짜 셀의 `aria-pressed`가 true인지 확인

2. **날짜 선택과 Todo 목록 연결**
   - 같은 주의 서로 다른 두 날짜 Todo 저장
   - 다른 날짜 셀 클릭
   - 클릭한 날짜 Todo만 표시되고 이전 날짜 Todo는 숨겨지는지 확인
   - `my-tasks-selected-date`가 클릭 날짜로 저장되는지 확인

3. **이전 주 / 다음 주 이동**
   - 다음 주 버튼 클릭 후 모든 날짜가 정확히 7일 이동하는지 확인
   - 선택 요일도 유지되며 선택 날짜가 7일 이동하는지 확인
   - 이전 주 버튼으로 원래 주와 선택 날짜가 복원되는지 확인

4. **주 이동과 Todo 목록 동기화**
   - 동일한 요일의 서로 다른 주에 Todo fixture 저장
   - 다음 주 이동 후 새 선택 날짜의 Todo만 표시되는지 확인
   - 선택 셀과 Todo 목록이 같은 날짜를 가리키는지 확인

5. **날짜별 Todo 개수**
   - 한 주의 여러 날짜에 서로 다른 개수의 Todo 저장
   - 각 날짜 셀 아래의 개수가 정확한지 확인
   - 0개 날짜는 숫자를 표시하지 않는지 확인

6. **개수의 CRUD 반영**
   - 선택 날짜에 Todo 추가 후 해당 셀 개수가 즉시 증가하는지 확인
   - Todo 삭제 후 개수가 감소하는지 확인
   - 완료 토글과 텍스트 수정은 개수를 바꾸지 않는지 확인

7. **필터와 독립적인 개수**
   - 완료·미완료 Todo를 함께 저장
   - "진행 중" 또는 "완료" 필터로 전환
   - 목록은 필터링되지만 날짜 셀 개수는 전체 개수를 유지하는지 확인

8. **오늘 날짜 스타일과 의미**
   - 오늘이 포함된 주를 렌더링
   - 오늘 셀이 식별 가능한 텍스트 또는 뱃지를 가지는지 확인
   - 오늘 셀을 선택해도 선택 상태와 오늘 상태가 모두 전달되는지 확인

9. **편집 상태와 필터 유지**
   - Todo 편집 중 다른 날짜를 선택했다가 돌아와도 편집 input이 다시 나타나지 않는지 확인
   - Todo 편집 중 다른 주로 이동했다가 돌아와도 편집 input이 다시 나타나지 않는지 확인
   - 필터를 선택한 뒤 날짜 선택·주 이동을 해도 필터가 유지되는지 확인

10. **주 시작 저장·복원**
    - 주 이동 후 `my-tasks-week-start`가 새 월요일로 저장되는지 확인
    - App을 언마운트하고 다시 렌더해 같은 주와 같은 선택 날짜가 복원되는지 확인

11. **잘못된 주 시작값 폴백**
    - 형식이 맞지 않는 문자열, 실제 달력에 없는 날짜, 월요일이 아닌 날짜를 각각 저장
    - App이 선택 날짜가 포함된 주로 예외 없이 렌더링되는지 확인
    - Effect 이후 올바른 월요일 키로 자동 교정되는지 확인

12. **선택 날짜와 주 시작 불일치 복구**
    - 서로 다른 주의 유효한 `my-tasks-selected-date`와 `my-tasks-week-start` 저장
    - 선택 날짜가 포함된 주를 표시하는지 확인
    - 주 시작 저장값이 선택 날짜의 월요일로 교정되는지 확인

13. **localStorage 읽기·쓰기 실패**
   - `getItem` 실패 시 오늘과 오늘이 속한 주로 렌더링되는지 확인
   - `setItem` 실패 시에도 Todo 추가, 날짜 선택과 주 이동 UI가 정상 동작하는지 확인

14. **지원 날짜 경계**
    - 최소·최대 지원 날짜가 선택된 상태에서도 주간 뷰가 예외 없이 렌더링되는지 확인
   - 정확한 지원 범위 밖 날짜 셀이 disabled이고 "지원 범위 밖"으로 안내되는지 확인
    - 범위 밖으로 이동하는 주차 버튼 동작이 no-op인지 확인
    - 선택 날짜와 저장값이 지원 범위를 벗어나지 않는지 확인

15. **기존 회귀 테스트**
    - 현재 33개 CRUD, 필터, Todo·선택 날짜 저장·손상 데이터 복구 테스트가 모두 계속 통과해야 한다.

---

## 접근성 요구사항

- 주간 뷰는 `<section aria-label="주간 뷰">`로 식별한다.
- 날짜 목록은 하나의 그룹으로 인식되도록 `role="group"`과 `aria-label="날짜 선택"`을 제공한다.
- 날짜 선택은 toggle button 패턴인 `aria-pressed`로 표현한다.
- 이전 / 다음 주 버튼은 아이콘만 보여도 각각 명확한 `aria-label`을 가진다.
- 날짜 버튼의 접근성 이름에는 전체 날짜와 Todo 개수를 포함한다.
- 선택, 오늘, disabled 상태를 색상만으로 전달하지 않는다.
- 모든 날짜와 이동 버튼은 키보드 포커스가 시각적으로 보여야 한다.
- 주간 범위 변경은 `aria-live="polite"`로 전달한다.

---

## 구현 순서

1. storage key 상수 추가
2. 주간 날짜 계산·검증 유틸 추가
3. 주 시작 저장·복원 유틸 추가
4. `WeekNavigator` 컴포넌트 작성
5. `App`에 `weekStartDate` state와 저장 Effect 추가
6. 날짜별 Todo 개수 파생값 추가
7. 날짜 선택·주 이동 핸들러 연결
8. 기존 `DateNavigator` 제거
9. 테스트 setup에 주 시작 키 격리 추가
10. 기존 날짜 테스트를 주간 구조에 맞게 수정
11. 주간 뷰·저장·오류·경계 테스트 추가
12. 전체 test·lint·build 실행
13. 브라우저에서 주 이동·날짜 선택·새로고침 복원을 수동 확인

---

## 검증 포인트

- [ ] 월요일부터 일요일까지 7개 날짜가 표시됨
- [ ] 주간 범위 텍스트가 월·연도 경계를 포함해 정확함
- [ ] 날짜 클릭 시 해당 날짜가 선택되고 해당 날짜 Todo만 표시됨
- [ ] 선택 날짜 셀과 실제 Todo 목록의 날짜가 항상 일치함
- [ ] 이전 주 / 다음 주 이동 시 날짜 목록이 정확히 7일 이동함
- [ ] 주 이동 시 선택 요일이 유지됨
- [ ] 각 날짜의 전체 Todo 개수가 정확히 표시됨
- [ ] Todo 추가·삭제 시 개수가 즉시 갱신됨
- [ ] Todo 완료 토글·수정 시 개수는 유지됨
- [ ] 상태 필터를 바꿔도 날짜별 개수는 전체 개수로 유지됨
- [ ] 오늘 날짜와 선택 날짜가 시각적·의미적으로 구분됨
- [ ] 날짜 선택·주 이동 시 편집 상태가 종료됨
- [ ] 날짜 선택·주 이동 후에도 필터가 유지됨
- [ ] `weekStartDate`가 `useState`로 관리됨
- [ ] `my-tasks-week-start`에 월요일 날짜 키가 저장됨
- [ ] 새로고침 또는 재마운트 후 선택 주차와 선택 날짜가 유지됨
- [ ] 손상되거나 월요일이 아닌 주 시작값이 안전하게 교정됨
- [ ] 선택 날짜와 주 시작 저장값이 불일치해도 같은 주로 복구됨
- [ ] localStorage 읽기·쓰기 실패가 UI를 중단시키지 않음
- [ ] 최소·최대 날짜의 경계 주에서 범위 밖 셀을 선택할 수 없음
- [ ] Todo와 선택 날짜의 기존 저장 데이터 계약이 유지됨
- [ ] 기존 회귀 테스트와 신규 주간 뷰 테스트가 모두 통과함
- [ ] `npm test -- --run`, `npm run lint`, `npm run build`가 통과함

---

## 금지 사항

- `weekStartDate`를 모듈 전역 변수로 관리 금지
- `weekStartDate`를 `selectedDate`에서 렌더마다 다시 계산해 state 요구사항을 무시하는 방식 금지
- `weekDates` 또는 `todoCountByDate`를 별도 state로 저장 금지
- 날짜별 개수를 `filteredTodos` 또는 `todosForDate`에서 계산 금지
- `WeekNavigator`에서 Todo 배열을 직접 수정하거나 App state를 소유하는 방식 금지
- 날짜 셀 클릭 시 DOM class를 직접 조작하는 방식 금지
- 주 이동 시 `weekStartDate`만 변경해 선택 셀과 Todo 목록이 다른 주를 가리키게 하는 방식 금지
- 주 이동 시 `selectedDate`를 `null`로 변경하는 방식 금지
- state의 Date 객체에 직접 `setDate`를 호출해 수정하는 방식 금지
- 한 state updater 내부에서 다른 state setter를 호출하는 방식 금지
- 날짜 선택·주 이동 핸들러에서 `localStorage.setItem` 직접 호출 금지
- 주 시작 Effect의 의존성 배열을 `[]`로 설정하거나 생략 금지
- `new Date('YYYY-MM-DD')` 방식으로 저장 날짜 파싱 금지
- Todo·선택 날짜용 `parseDateKey`의 지원 범위를 주 시작 경계 처리 때문에 완화 금지
- 프로덕션 코드 여러 파일에 `my-tasks-week-start` 문자열 하드코딩 금지
- 선택·오늘 상태를 색상만으로 표현 금지
- 사진 요구사항에 없는 월간 뷰, 자정 타이머, "이번 주로 이동" 기능 추가 금지

---

## 학습 확인 질문

### `selectedDate`와 `weekStartDate`를 왜 둘 다 state로 관리하는가?

- `selectedDate`는 Todo 조회와 생성 대상 날짜다.
- `weekStartDate`는 화면에 표시하는 7일 범위를 결정한다.
- 책임은 다르지만 선택 날짜가 표시 주 안에 있어야 하므로 이벤트 핸들러에서 불변식을 함께 유지한다.

### 주 이동 시 두 날짜를 모두 7일 이동하는 이유는 무엇인가?

- 주 시작일만 이동하면 화면에 선택 표시가 없는데 이전 주 Todo가 계속 표시될 수 있다.
- 선택 날짜를 함께 이동하면 선택 요일을 유지하면서 셀·목록·입력 대상 날짜가 일치한다.

### 날짜별 개수를 `useMemo`로 계산하는 이유는 무엇인가?

- 개수는 `todos`로부터 완전히 계산 가능한 파생값이므로 별도 state가 필요 없다.
- 별도 state로 저장하면 CRUD 때마다 두 state를 동기화해야 하고 불일치 가능성이 생긴다.
- 필터 결과가 아닌 전체 `todos`를 기준으로 계산해야 주간 요약의 의미가 유지된다.

### `weekStartDate` 저장 Effect가 별도로 필요한 이유는 무엇인가?

- 선택 날짜와 주 시작일은 서로 다른 저장 계약이다.
- `[weekStartDate]` Effect는 주 상태가 변경된 commit 이후 최신 월요일을 저장한다.
- 핸들러에서 직접 저장하지 않아 상태 변경 책임과 지속성 책임을 분리한다.
