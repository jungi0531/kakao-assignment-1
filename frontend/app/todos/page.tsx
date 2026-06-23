// Server Component — async로 searchParams를 받아 날짜/필터를 결정
// actions.ts를 통해 FastAPI에서 Todo 목록을 조회하고 렌더링
import WeekNavigator from '@/components/WeekNavigator'
import TodoInput from '@/components/TodoInput'
import TodoFilter from '@/components/TodoFilter'
import TodoList from '@/components/TodoList'
import { getDateKey, getWeekStart, parseDateKey } from '@/lib/date'
import { FILTER, FILTER_ORDER, type FilterValue } from '@/types/todo'
import { getTodos } from '@/app/actions'

interface SearchParams {
  date?: string
  weekStart?: string
  filter?: string
}

export default async function TodosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams

  const today = new Date()
  const selectedDate = params.date ?? getDateKey(today)
  const weekStart =
    params.weekStart ?? getDateKey(getWeekStart(parseDateKey(selectedDate)))
  // 유효하지 않은 filter 값이 URL에 들어와도 안전하게 FILTER.ALL로 폴백
  const filter: FilterValue = FILTER_ORDER.includes(params.filter as FilterValue)
    ? (params.filter as FilterValue)
    : FILTER.ALL

  const [todos, allTodos] = await Promise.all([
    getTodos(selectedDate),
    getTodos(),
  ])
  const todoCountByDate = allTodos.reduce<Record<string, number>>((acc, todo) => {
    acc[todo.date] = (acc[todo.date] ?? 0) + 1
    return acc
  }, {})

  return (
    <>
      <header className="mb-6 text-center">
        <h1 className="text-[2rem] font-bold tracking-[-0.5px] text-primary max-[480px]:text-2xl">
          My Tasks
        </h1>
        <p className="mt-1 text-sm text-text-secondary">오늘 할 일을 관리해보세요</p>
      </header>

      <main>
        <WeekNavigator
          selectedDate={selectedDate}
          weekStart={weekStart}
          currentFilter={filter}
          todoCountByDate={todoCountByDate}
        />
        <TodoInput selectedDate={selectedDate} />
        <TodoFilter
          currentFilter={filter}
          selectedDate={selectedDate}
          weekStart={weekStart}
        />
        <TodoList todos={todos} filter={filter} />
      </main>
    </>
  )
}
