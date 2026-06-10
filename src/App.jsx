import { useEffect, useMemo, useState } from 'react'
import TodoInput from './components/TodoInput.jsx'
import TodoFilter from './components/TodoFilter.jsx'
import TodoList from './components/TodoList.jsx'
import WeekNavigator from './components/WeekNavigator.jsx'
import { FILTER } from './constants/todo.js'
import {
  createMidnightDate,
  getDateKey,
  isDateInWeek,
  isSupportedDate,
  isSupportedWeekStart,
} from './utils/date.js'
import {
  loadSelectedDateFromStorage,
  loadTodosFromStorage,
  loadWeekStartDateFromStorage,
  saveSelectedDateToStorage,
  saveTodosToStorage,
  saveWeekStartDateToStorage,
} from './utils/storage.js'

function createTodoId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function App() {
  const [todos, setTodos] = useState(loadTodosFromStorage)
  const [editingId, setEditingId] = useState(null)
  const [filter, setFilter] = useState(FILTER.ALL)
  const [selectedDate, setSelectedDate] = useState(loadSelectedDateFromStorage)
  const [weekStartDate, setWeekStartDate] = useState(() =>
    loadWeekStartDateFromStorage(selectedDate),
  )

  useEffect(() => {
    saveTodosToStorage(todos)
  }, [todos])

  useEffect(() => {
    saveSelectedDateToStorage(selectedDate)
  }, [selectedDate])

  useEffect(() => {
    saveWeekStartDateToStorage(weekStartDate)
  }, [weekStartDate])

  const todoCountByDate = useMemo(
    () =>
      todos.reduce((counts, todo) => {
        counts[todo.date] = (counts[todo.date] ?? 0) + 1
        return counts
      }, {}),
    [todos],
  )

  // todos와 selectedDate에서 파생 — filteredTodos보다 먼저 선언해야 참조 가능
  const todosForDate = useMemo(
    () => todos.filter((todo) => todo.date === getDateKey(selectedDate)),
    [todos, selectedDate],
  )

  // todosForDate와 filter에서 파생 — 별도 state로 저장하지 않음
  const filteredTodos = useMemo(() => {
    if (filter === FILTER.ACTIVE) {
      return todosForDate.filter((todo) => !todo.completed)
    }
    if (filter === FILTER.COMPLETED) {
      return todosForDate.filter((todo) => todo.completed)
    }
    return todosForDate
  }, [todosForDate, filter])

  const handleFilterChange = (nextFilter) => {
    // 필터 전환 시 편집 중인 항목이 화면에서 사라지면 editingId가 고아 상태로 남으므로 미리 초기화
    setEditingId(null)
    setFilter(nextFilter)
  }

  const handleSelectDate = (date) => {
    if (!isSupportedDate(date) || !isDateInWeek(date, weekStartDate)) {
      return
    }

    setEditingId(null)
    setSelectedDate(createMidnightDate(date))
  }

  const handleMoveWeek = (delta) => {
    const nextWeekStart = createMidnightDate(weekStartDate)
    nextWeekStart.setDate(nextWeekStart.getDate() + delta)

    const nextSelectedDate = createMidnightDate(selectedDate)
    nextSelectedDate.setDate(nextSelectedDate.getDate() + delta)

    if (
      !isSupportedWeekStart(nextWeekStart)
      || !isSupportedDate(nextSelectedDate)
    ) {
      return
    }

    setEditingId(null)
    setWeekStartDate(nextWeekStart)
    setSelectedDate(nextSelectedDate)
  }

  const handleAddTodo = (text) => {
    const normalizedText = text.trim()

    if (!normalizedText) {
      return
    }

    const newTodo = {
      id: createTodoId(),
      text: normalizedText,
      completed: false,
      date: getDateKey(selectedDate),
    }

    setTodos((previousTodos) => [...previousTodos, newTodo])
  }

  const handleToggleTodo = (id) => {
    // 편집 중인 항목을 토글하면 필터에 의해 언마운트될 수 있으므로 editingId를 미리 초기화
    if (editingId === id) {
      setEditingId(null)
    }
    setTodos((previousTodos) =>
      previousTodos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo,
      ),
    )
  }

  const handleStartEdit = (id) => {
    setEditingId(id)
  }

  const handleSaveEdit = (id, text) => {
    const normalizedText = text.trim()

    if (!normalizedText) {
      return
    }

    setTodos((previousTodos) =>
      previousTodos.map((todo) =>
        todo.id === id ? { ...todo, text: normalizedText } : todo,
      ),
    )
    setEditingId(null)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
  }

  const handleDeleteTodo = (id) => {
    setTodos((previousTodos) =>
      previousTodos.filter((todo) => todo.id !== id),
    )
    setEditingId((currentEditingId) =>
      currentEditingId === id ? null : currentEditingId,
    )
  }

  return (
    <div className="mx-auto w-full max-w-[600px]">
      <header className="mb-6 text-center">
        <h1 className="text-[2rem] font-bold tracking-[-0.5px] text-primary max-[480px]:text-2xl">
          My Tasks
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          오늘 할 일을 관리해보세요
        </p>
      </header>

      <main>
        <WeekNavigator
          weekStartDate={weekStartDate}
          selectedDate={selectedDate}
          todoCountByDate={todoCountByDate}
          onSelectDate={handleSelectDate}
          onPrevWeek={() => handleMoveWeek(-7)}
          onNextWeek={() => handleMoveWeek(7)}
        />
        <TodoInput onAddTodo={handleAddTodo} />
        <TodoFilter filter={filter} onFilterChange={handleFilterChange} />
        <TodoList
          todos={filteredTodos}
          totalCount={todosForDate.length}
          editingId={editingId}
          onToggleTodo={handleToggleTodo}
          onStartEdit={handleStartEdit}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={handleCancelEdit}
          onDeleteTodo={handleDeleteTodo}
        />
      </main>
    </div>
  )
}

export default App
