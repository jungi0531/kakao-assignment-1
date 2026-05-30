// ============================================================
// 앱 상태
// ============================================================

/** Todo 아이템 배열. 각 아이템: { id: number, text: string, completed: boolean, date: string } */
let todos = [];

/** 현재 인라인 편집 중인 Todo의 id. 편집 중이 아니면 null */
let editingId = null;

/** 편집 저장 시 빈 값 제출 여부 — true면 에러 메시지를 렌더링한다 */
let editError = false;

/** 현재 활성 필터. 'all' | 'active' | 'completed' */
let currentFilter = 'all';

/** 현재 선택된 날짜 (Date 객체). 시간은 항상 00:00:00으로 고정해 날짜만 비교한다 */
let selectedDate = createMidnightDate(new Date());

/** 현재 주간 뷰에서 보고 있는 주의 월요일 (Date 객체) */
let weekStartDate = getWeekStart(new Date());

// ============================================================
// DOM 요소 참조
// ============================================================
const todoInput      = document.getElementById('todo-input');
const addBtn         = document.getElementById('add-btn');
const todoList       = document.getElementById('todo-list');
const errorMsg       = document.getElementById('error-msg');
const emptyState     = document.getElementById('empty-state');
const emptyMsg       = document.getElementById('empty-msg');
const statsText      = document.getElementById('stats-text');
const prevWeekBtn    = document.getElementById('prev-week-btn');
const nextWeekBtn    = document.getElementById('next-week-btn');
const weekRangeText  = document.getElementById('week-range-text');
const weekGrid       = document.getElementById('week-grid');
const currentWeekBtn = document.getElementById('current-week-btn');

// ============================================================
// 상태 헬퍼
// ============================================================

/** 인라인 편집 상태를 초기화한다 */
function resetEditState() {
  editingId = null;
  editError = false;
}

/**
 * 특정 날짜의 Todo 목록을 반환한다
 * @param {string} dateKey - 'YYYY-MM-DD' 형식의 날짜 키
 * @returns {Array}
 */
function getTodosForDate(dateKey) {
  return todos.filter(todo => todo.date === dateKey);
}

// ============================================================
// 로컬스토리지
// ============================================================

/** Todo 목록 저장 키 */
const STORAGE_KEY = 'my-tasks-todos';

/** 선택 날짜 저장 키 */
const DATE_STORAGE_KEY = 'my-tasks-selected-date';

/** 주간 뷰 시작 날짜 저장 키 */
const WEEK_START_KEY = 'my-tasks-week-start';

/** todos 배열을 JSON으로 직렬화해 로컬스토리지에 저장한다 */
function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

/**
 * 로컬스토리지에서 todos 데이터를 불러와 todos 배열에 복원한다
 * 저장된 데이터가 없으면 빈 배열로 유지한다
 */
function loadTodos() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    todos = JSON.parse(saved);
  }
}

/** 현재 선택된 날짜를 로컬스토리지에 저장한다. null이면 항목을 제거한다 */
function saveSelectedDate() {
  if (selectedDate) {
    localStorage.setItem(DATE_STORAGE_KEY, getDateKey(selectedDate));
  } else {
    localStorage.removeItem(DATE_STORAGE_KEY);
  }
}

/**
 * 로컬스토리지에서 선택 날짜를 복원한다
 * new Date(문자열) 방식은 타임존 오류가 발생할 수 있어
 * 연·월·일을 분리해 직접 생성한다
 */
function loadSelectedDate() {
  const saved = localStorage.getItem(DATE_STORAGE_KEY);
  if (saved) {
    const [y, m, d] = saved.split('-').map(Number);
    selectedDate = createMidnightDate(new Date(y, m - 1, d));
  }
}

/** 현재 주간 뷰의 시작 날짜를 로컬스토리지에 저장한다 */
function saveWeekStart() {
  localStorage.setItem(WEEK_START_KEY, getDateKey(weekStartDate));
}

/** 로컬스토리지에서 주간 뷰 시작 날짜를 복원한다 */
function loadWeekStart() {
  const saved = localStorage.getItem(WEEK_START_KEY);
  if (saved) {
    const [y, m, d] = saved.split('-').map(Number);
    weekStartDate = createMidnightDate(new Date(y, m - 1, d));
  }
}

// ============================================================
// 날짜 유틸리티
// ============================================================

/**
 * Date 객체의 시간을 00:00:00으로 초기화해 반환한다
 * 날짜 비교 시 시간 차이로 인한 오류를 방지하기 위해 사용
 * @param {Date} date
 * @returns {Date}
 */
function createMidnightDate(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Date 객체를 'YYYY-MM-DD' 형식의 문자열로 변환한다
 * Todo의 date 필드 저장 및 비교에 사용
 * @param {Date} date
 * @returns {string}
 */
function getDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 주어진 날짜가 오늘인지 확인한다
 * @param {Date} date
 * @returns {boolean}
 */
function isToday(date) {
  return getDateKey(date) === getDateKey(new Date());
}

/**
 * 주어진 날짜가 속한 주의 월요일을 반환한다
 * @param {Date} date
 * @returns {Date}
 */
function getWeekStart(date) {
  const d = createMidnightDate(date);
  const day = d.getDay(); // 0(일) ~ 6(토)
  // 일요일이면 6일 전, 나머지는 (요일 - 1)일 전이 월요일
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

/**
 * 주어진 월요일로부터 7일치 날짜 배열(월 ~ 일)을 반환한다
 * @param {Date} weekStart - 월요일 Date 객체
 * @returns {Date[]}
 */
function getWeekDates(weekStart) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

/**
 * 주어진 주의 시작일이 오늘이 속한 주인지 확인한다
 * @param {Date} weekStart
 * @returns {boolean}
 */
function isCurrentWeek(weekStart) {
  return getDateKey(weekStart) === getDateKey(getWeekStart(new Date()));
}

/**
 * 주간 범위를 "M월 D일 – M월 D일" 형식으로 반환한다
 * 현재 연도가 아닌 경우 연도를 앞에 붙인다
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {string}
 */
function formatWeekRange(startDate, endDate) {
  const currentYear = new Date().getFullYear();

  function format(date) {
    const prefix = date.getFullYear() !== currentYear ? `${date.getFullYear()}년 ` : '';
    return `${prefix}${date.getMonth() + 1}월 ${date.getDate()}일`;
  }

  return `${format(startDate)} – ${format(endDate)}`;
}

// ============================================================
// 주간 뷰
// ============================================================

/** 주간 뷰 헤더와 날짜 그리드를 현재 weekStartDate 기준으로 렌더링한다 */
function renderWeekView() {
  const weekDates = getWeekDates(weekStartDate);

  // 주간 범위 텍스트 갱신
  weekRangeText.textContent = formatWeekRange(weekDates[0], weekDates[6]);

  // 현재 주가 아닐 때만 '이번 주로 이동' 버튼을 표시
  currentWeekBtn.classList.toggle('is-visible', !isCurrentWeek(weekStartDate));

  // 날짜 셀 렌더링
  weekGrid.innerHTML = '';
  weekDates.forEach(date => {
    const cell = createWeekDayCell(date);
    weekGrid.appendChild(cell);
  });
}

/**
 * 날짜 하나에 해당하는 주간 뷰 셀(button)을 생성해 반환한다
 * - 오늘이면: '오늘' 뱃지 포함, is-today 클래스
 * - 선택된 날짜이면: is-selected 클래스
 * - Todo 개수가 있으면: 개수 표시
 * @param {Date} date
 * @returns {HTMLButtonElement}
 */
function createWeekDayCell(date) {
  const dateKey     = getDateKey(date);
  const isSelected  = selectedDate !== null && dateKey === getDateKey(selectedDate);
  const isTodayDate = isToday(date);
  const count       = getTodosForDate(dateKey).length;

  const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = [
    'week-day',
    isSelected  ? 'is-selected' : '',
    isTodayDate ? 'is-today'    : '',
  ].filter(Boolean).join(' ');
  btn.setAttribute('aria-pressed', String(isSelected));
  btn.setAttribute('aria-label', `${date.getMonth() + 1}월 ${date.getDate()}일`);
  btn.addEventListener('click', () => selectDate(date));

  // 요일 레이블 (월, 화, 수...)
  const label = document.createElement('span');
  label.className = 'week-day-label';
  label.textContent = DAY_LABELS[date.getDay()];

  // 날짜 숫자
  const number = document.createElement('span');
  number.className = 'week-day-number';
  number.textContent = date.getDate();

  btn.appendChild(label);
  btn.appendChild(number);

  // 오늘 뱃지 — 항상 렌더링해 셀 높이를 균일하게 유지하고,
  // 오늘이 아닐 때는 visibility: hidden으로 공간만 차지한다
  const todayBadgeEl = document.createElement('span');
  todayBadgeEl.className = `week-day-today-badge${isTodayDate ? ' is-visible' : ''}`;
  todayBadgeEl.textContent = '오늘';
  btn.appendChild(todayBadgeEl);

  // Todo 개수 — 개수가 있을 때만 표시 (없으면 자리를 보존해 레이아웃 안정)
  const countEl = document.createElement('span');
  countEl.className = `week-day-count${count > 0 ? ' has-count' : ''}`;
  countEl.textContent = count > 0 ? String(count) : '';
  btn.appendChild(countEl);

  return btn;
}

/** 날짜를 선택하고 해당 날짜의 Todo 목록을 표시한다 */
function selectDate(date) {
  resetEditState();
  selectedDate = createMidnightDate(date);
  saveSelectedDate();
  renderWeekView(); // 선택 표시 갱신
  renderTodos();
}

/**
 * 현재 주에서 delta일만큼 이동한다 (-7: 이전 주, +7: 다음 주)
 * @param {number} delta
 */
function moveWeek(delta) {
  resetEditState();
  weekStartDate = new Date(weekStartDate);
  weekStartDate.setDate(weekStartDate.getDate() + delta);
  // 주 이동 시 날짜 선택을 초기화해 할 일 목록을 비운다
  selectedDate = null;
  saveWeekStart();
  saveSelectedDate();
  renderWeekView();
  renderTodos();
}

/** 이번 주로 이동하고 오늘 날짜를 선택한다 */
function goToCurrentWeek() {
  resetEditState();
  selectedDate  = createMidnightDate(new Date());
  weekStartDate = getWeekStart(selectedDate);
  saveSelectedDate();
  saveWeekStart();
  renderWeekView();
  renderTodos();
}

// ============================================================
// CRUD 기능
// ============================================================

/** 입력값을 읽어 새 Todo를 추가한다 */
function addTodo() {
  const inputText = todoInput.value.trim();

  // 날짜가 선택되지 않은 상태면 중단
  if (!selectedDate) {
    showError('날짜를 먼저 선택해주세요.');
    return;
  }

  // 빈 입력값이면 안내 메시지를 표시하고 중단
  if (!inputText) {
    showError('할 일을 입력해주세요.');
    todoInput.classList.add('is-error');
    return;
  }

  clearError();

  // 새 Todo 객체 생성 (id는 고유값 보장을 위해 타임스탬프 사용)
  const newTodo = {
    id:        Date.now(),
    text:      inputText,
    completed: false,
    date:      getDateKey(selectedDate), // 현재 선택된 날짜를 함께 저장
  };

  // 기존 배열을 직접 수정하지 않고 새 배열로 교체 (불변성 유지)
  todos = [...todos, newTodo];
  saveTodos();

  todoInput.value = '';
  renderWeekView(); // 날짜 셀의 Todo 개수 갱신
  renderTodos();
}

/** 해당 id의 Todo 완료 상태를 토글한다 */
function toggleTodo(id) {
  todos = todos.map(todo =>
    todo.id === id ? { ...todo, completed: !todo.completed } : todo
  );
  saveTodos();
  renderWeekView(); // 날짜 셀의 Todo 개수 갱신
  renderTodos();
}

/** 해당 id의 Todo를 삭제한다 */
function deleteTodo(id) {
  todos = todos.filter(todo => todo.id !== id);
  // 삭제된 항목이 편집 중이었다면 편집 상태도 초기화
  if (editingId === id) resetEditState();
  saveTodos();
  renderWeekView(); // 날짜 셀의 Todo 개수 갱신
  renderTodos();
}

/** 해당 id의 Todo를 인라인 편집 모드로 전환한다 */
function startEditTodo(id) {
  editingId = id;
  editError = false; // 이전 편집의 에러 상태 초기화
  renderTodos();

  // 렌더링 후 수정 인풋에 자동 포커스
  const editInput = document.querySelector('.todo-edit-input');
  if (editInput) {
    editInput.focus();
    // 커서를 텍스트 끝으로 이동
    editInput.setSelectionRange(editInput.value.length, editInput.value.length);
  }
}

/** 인라인 편집 내용을 저장한다 */
function saveEditTodo(id) {
  const editInput = document.querySelector('.todo-edit-input');
  if (!editInput) return;

  const newText = editInput.value.trim();

  // 빈 텍스트면 에러 상태로 전환하고 다시 렌더링
  if (!newText) {
    editError = true;
    renderTodos();
    // 재렌더링 후 인풋에 다시 포커스
    const newInput = document.querySelector('.todo-edit-input');
    if (newInput) newInput.focus();
    return;
  }

  todos = todos.map(todo =>
    todo.id === id ? { ...todo, text: newText } : todo
  );
  saveTodos();

  resetEditState();
  renderWeekView(); // 날짜 셀의 Todo 개수 갱신
  renderTodos();
}

/** 인라인 편집을 취소하고 원래 상태로 돌아간다 */
function cancelEditTodo() {
  resetEditState();
  renderTodos();
}

// ============================================================
// 필터링
// ============================================================

/**
 * 선택된 날짜를 먼저 걸러낸 뒤 currentFilter를 적용해 반환한다
 * @returns {Array} 필터링된 Todo 배열
 */
function getFilteredTodos() {
  // 날짜가 선택되지 않은 상태면 빈 배열 반환
  if (!selectedDate) return [];

  // 1단계: 선택된 날짜에 해당하는 항목만 추림
  const dateTodos = getTodosForDate(getDateKey(selectedDate));

  // 2단계: 상태 필터 적용
  if (currentFilter === 'active')    return dateTodos.filter(todo => !todo.completed);
  if (currentFilter === 'completed') return dateTodos.filter(todo =>  todo.completed);
  return dateTodos; // 'all'
}

/**
 * 현재 필터에 맞는 빈 상태 메시지를 반환한다
 * @returns {string}
 */
function getEmptyMessage() {
  if (!selectedDate)                 return '날짜를 선택해주세요.';
  if (currentFilter === 'active')    return '진행 중인 할 일이 없습니다.';
  if (currentFilter === 'completed') return '완료된 할 일이 없습니다.';
  return '할 일이 없습니다.<br />새로운 할 일을 추가해보세요!';
}

/**
 * 필터를 변경하고 탭 활성 상태와 목록을 갱신한다
 * @param {'all'|'active'|'completed'} filter
 */
function setFilter(filter) {
  currentFilter = filter;

  // 필터 전환 시 편집 중인 항목이 있으면 취소
  resetEditState();

  // 탭 활성 상태 업데이트 (재렌더링 없이 DOM 직접 조작)
  document.querySelectorAll('.filter-tab').forEach(tab => {
    const isActive = tab.dataset.filter === filter;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });

  renderTodos();
}

// ============================================================
// 렌더링
// ============================================================

/** todos 배열을 기반으로 목록 전체를 다시 그린다 */
function renderTodos() {
  todoList.innerHTML = '';

  const filteredTodos = getFilteredTodos();

  if (filteredTodos.length === 0) {
    emptyState.classList.add('is-visible');
    // innerHTML 사용: <br> 태그가 포함된 메시지를 표현하기 위해 사용
    emptyMsg.innerHTML = getEmptyMessage();
    updateStats();
    return;
  }

  emptyState.classList.remove('is-visible');

  filteredTodos.forEach(todo => {
    const li = createTodoElement(todo);
    todoList.appendChild(li);
  });

  updateStats();
}

/** 단일 Todo 아이템의 li 요소를 생성해 반환한다 */
function createTodoElement(todo) {
  const li = document.createElement('li');
  li.className = `todo-item${todo.completed ? ' is-completed' : ''}`;
  li.dataset.id = todo.id;

  const isEditing = editingId === todo.id;

  // --- 체크박스 (완료 토글) ---
  const checkbox = document.createElement('div');
  checkbox.className = `todo-checkbox${todo.completed ? ' is-checked' : ''}`;
  checkbox.setAttribute('role', 'checkbox');
  checkbox.setAttribute('aria-checked', String(todo.completed));
  checkbox.setAttribute('aria-label', todo.completed ? '완료 취소' : '완료로 표시');
  checkbox.setAttribute('tabindex', '0');
  checkbox.addEventListener('click', () => toggleTodo(todo.id));
  // 키보드 접근성: Enter / Space 로도 토글 가능
  checkbox.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleTodo(todo.id);
    }
  });

  // --- 중간 영역: 텍스트 or 편집 래퍼 ---
  let middleContent;

  if (isEditing) {
    // 편집 모드: 인풋과 에러 메시지를 감싸는 래퍼 div
    // (flex 아이템 하나 안에서 세로로 쌓기 위해 래퍼가 필요)
    middleContent = document.createElement('div');
    middleContent.className = 'edit-wrapper';

    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.className = `todo-edit-input${editError ? ' is-error' : ''}`;
    editInput.value = todo.text;
    editInput.addEventListener('keydown', e => {
      if (e.key === 'Enter')  saveEditTodo(todo.id);
      if (e.key === 'Escape') cancelEditTodo();
    });
    // 다시 입력하기 시작하면 에러 상태를 DOM에서 즉시 제거 (재렌더링 없이)
    editInput.addEventListener('input', () => {
      if (editInput.value.trim() && editError) {
        editError = false;
        editInput.classList.remove('is-error');
        const errEl = middleContent.querySelector('.edit-error-msg');
        if (errEl) errEl.remove();
      }
    });

    middleContent.appendChild(editInput);

    // 에러 상태일 때만 에러 메시지 요소를 동적으로 생성해 추가
    if (editError) {
      const errEl = document.createElement('p');
      errEl.className = 'edit-error-msg';
      errEl.setAttribute('role', 'alert');
      errEl.textContent = '할 일을 입력해주세요.';
      middleContent.appendChild(errEl);
    }
  } else {
    // 일반 모드: span 요소 렌더링
    middleContent = document.createElement('span');
    middleContent.className = 'todo-text';
    middleContent.textContent = todo.text;
  }

  // --- 액션 버튼 그룹 ---
  const actions = document.createElement('div');
  actions.className = 'todo-actions';

  if (isEditing) {
    // 편집 모드: 저장 버튼
    const saveBtn = createActionButton('save-btn', '✓', '저장', () => saveEditTodo(todo.id));
    actions.appendChild(saveBtn);
  } else {
    // 일반 모드: 수정 버튼
    const editBtn = createActionButton('edit-btn', '✎', '수정', () => startEditTodo(todo.id));
    actions.appendChild(editBtn);
  }

  // 삭제 버튼은 항상 표시
  const deleteBtn = createActionButton('delete-btn', '✕', '삭제', () => deleteTodo(todo.id));
  actions.appendChild(deleteBtn);

  li.appendChild(checkbox);
  li.appendChild(middleContent);
  li.appendChild(actions);

  return li;
}

/**
 * 액션 버튼 요소를 생성해 반환한다
 * @param {string}   extraClass  - 버튼 추가 클래스
 * @param {string}   icon        - 버튼 아이콘 문자
 * @param {string}   ariaLabel   - 스크린리더용 레이블
 * @param {Function} onClick     - 클릭 핸들러
 */
function createActionButton(extraClass, icon, ariaLabel, onClick) {
  const btn = document.createElement('button');
  btn.className = `action-btn ${extraClass}`;
  btn.innerHTML = icon;
  btn.setAttribute('aria-label', ariaLabel);
  btn.addEventListener('click', onClick);
  return btn;
}

/** 현재 필터에 맞는 통계 텍스트를 갱신한다 */
function updateStats() {
  if (!selectedDate) { statsText.textContent = ''; return; }
  const dateTodos      = getTodosForDate(getDateKey(selectedDate));
  const completedCount = dateTodos.filter(todo => todo.completed).length;
  const activeCount    = dateTodos.length - completedCount;

  if (dateTodos.length === 0) {
    statsText.textContent = '';
    return;
  }

  // 탭별로 현재 보고 있는 맥락에 맞는 통계를 표시
  if (currentFilter === 'active') {
    statsText.textContent = `${activeCount}개`;
  } else if (currentFilter === 'completed') {
    statsText.textContent = `${completedCount}개`;
  } else {
    statsText.textContent = `${completedCount} / ${dateTodos.length} 완료`;
  }
}

// ============================================================
// 오류 처리 (추가 인풋용)
// ============================================================

/** 오류 메시지를 표시하고 3초 후 자동으로 제거한다 */
function showError(message) {
  errorMsg.textContent = message;
  setTimeout(clearError, 3000);
}

/** 오류 메시지와 인풋의 에러 상태를 초기화한다 */
function clearError() {
  errorMsg.textContent = '';
  todoInput.classList.remove('is-error');
}

// ============================================================
// 자정 동기화
// ============================================================

/**
 * 자정에 주간 뷰를 자동 갱신하는 타이머를 등록한다
 * 자정까지 남은 밀리초를 계산해 setTimeout으로 정확히 맞추고,
 * 이후 매 24시간마다 setInterval로 반복한다
 */
function scheduleMidnightRefresh() {
  const now = new Date();
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const msUntilMidnight = nextMidnight - now;

  setTimeout(() => {
    renderWeekView(); // 자정에 오늘 날짜 표시 갱신
    // 첫 자정 이후 매일 정확히 24시간마다 반복
    setInterval(renderWeekView, 24 * 60 * 60 * 1000);
  }, msUntilMidnight);
}

// ============================================================
// 이벤트 리스너 등록
// ============================================================

// 추가 버튼 클릭
addBtn.addEventListener('click', addTodo);

// 입력창에서 Enter 키를 누르면 추가
todoInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') addTodo();
});

// 다시 입력하기 시작하면 에러 상태를 즉시 해제
todoInput.addEventListener('input', () => {
  if (todoInput.value.trim()) clearError();
});

// 이전 주 / 다음 주 버튼 — moveWeek에 방향(delta)만 전달
prevWeekBtn.addEventListener('click', () => moveWeek(-7));
nextWeekBtn.addEventListener('click', () => moveWeek(7));

// 이번 주로 이동 버튼
currentWeekBtn.addEventListener('click', goToCurrentWeek);

// 필터 탭 클릭 이벤트 — 이벤트 위임으로 탭 컨테이너에 한 번만 등록
document.querySelector('.filter-tabs').addEventListener('click', e => {
  const tab = e.target.closest('.filter-tab');
  if (!tab) return;
  setFilter(tab.dataset.filter);
});

// ============================================================
// 초기화
// ============================================================

// 페이지 로드 시 로컬스토리지에서 데이터 복원
loadTodos();
loadSelectedDate();
loadWeekStart();
renderWeekView();
renderTodos();

// 자정에 주간 뷰가 자동으로 갱신되도록 타이머 등록
scheduleMidnightRefresh();
