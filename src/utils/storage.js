import {
  SELECTED_DATE_STORAGE_KEY,
  TODOS_STORAGE_KEY,
  WEEK_START_STORAGE_KEY,
} from '../constants/storage.js'
import { MAX_TODO_LENGTH } from '../constants/todo.js'
import {
  createMidnightDate,
  getDateKey,
  getWeekStart,
  isDateInWeek,
  parseDateKey,
  parseWeekStartKey,
} from './date.js'

function normalizeTodo(todo) {
  if (typeof todo !== 'object' || todo === null || Array.isArray(todo)) {
    return null
  }

  const hasValidStringId = typeof todo.id === 'string' && todo.id.length > 0
  const hasValidNumberId =
    typeof todo.id === 'number' && Number.isSafeInteger(todo.id)
  const normalizedText =
    typeof todo.text === 'string' ? todo.text.trim() : ''

  if (
    (!hasValidStringId && !hasValidNumberId)
    || normalizedText.length === 0
    || normalizedText.length > MAX_TODO_LENGTH
    || typeof todo.completed !== 'boolean'
    || parseDateKey(todo.date) === null
  ) {
    return null
  }

  return {
    id: String(todo.id),
    text: normalizedText,
    completed: todo.completed,
    date: todo.date,
  }
}

export function loadTodosFromStorage() {
  try {
    const storedTodos = localStorage.getItem(TODOS_STORAGE_KEY)

    if (storedTodos === null) {
      return []
    }

    const parsedTodos = JSON.parse(storedTodos)

    if (!Array.isArray(parsedTodos)) {
      return []
    }

    const restoredIds = new Set()
    const restoredTodos = []

    parsedTodos.forEach((todo) => {
      const normalizedTodo = normalizeTodo(todo)

      if (normalizedTodo === null || restoredIds.has(normalizedTodo.id)) {
        return
      }

      restoredIds.add(normalizedTodo.id)
      restoredTodos.push(normalizedTodo)
    })

    return restoredTodos
  } catch {
    return []
  }
}

export function saveTodosToStorage(todos) {
  try {
    localStorage.setItem(TODOS_STORAGE_KEY, JSON.stringify(todos))
  } catch {
    // 저장 실패가 현재 메모리 상태와 UI 동작을 중단시키지 않도록 무시한다.
  }
}

export function loadSelectedDateFromStorage() {
  try {
    const storedDate = localStorage.getItem(SELECTED_DATE_STORAGE_KEY)
    const parsedDate = parseDateKey(storedDate)

    if (parsedDate !== null) {
      return parsedDate
    }
  } catch {
    // 읽기 실패도 최초 방문과 동일하게 오늘 날짜로 복구한다.
  }

  return createMidnightDate(new Date())
}

export function saveSelectedDateToStorage(selectedDate) {
  try {
    localStorage.setItem(
      SELECTED_DATE_STORAGE_KEY,
      getDateKey(selectedDate),
    )
  } catch {
    // 저장 실패가 현재 메모리 상태와 UI 동작을 중단시키지 않도록 무시한다.
  }
}

export function loadWeekStartDateFromStorage(selectedDate) {
  try {
    const storedWeekStart = localStorage.getItem(WEEK_START_STORAGE_KEY)
    const parsedWeekStart = parseWeekStartKey(storedWeekStart)

    if (
      parsedWeekStart !== null
      && isDateInWeek(selectedDate, parsedWeekStart)
    ) {
      return parsedWeekStart
    }
  } catch {
    // 읽기 실패도 선택 날짜가 속한 주를 보여주는 방식으로 복구한다.
  }

  return getWeekStart(selectedDate)
}

export function saveWeekStartDateToStorage(weekStartDate) {
  try {
    localStorage.setItem(
      WEEK_START_STORAGE_KEY,
      getDateKey(weekStartDate),
    )
  } catch {
    // 저장 실패가 현재 메모리 상태와 UI 동작을 중단시키지 않도록 무시한다.
  }
}
