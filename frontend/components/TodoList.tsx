// Server Component — 단순 렌더링만 담당. 인터랙션은 TodoItem(Client)이 처리
import type { Todo, FilterValue } from '@/types/todo'
import { FILTER } from '@/types/todo'
import TodoItem from './TodoItem'

interface TodoListProps {
  todos: Todo[]
  filter: FilterValue
}

export default function TodoList({ todos, filter }: TodoListProps) {
  const filtered = todos.filter((todo) => {
    if (filter === FILTER.ACTIVE) return !todo.completed
    if (filter === FILTER.COMPLETED) return todo.completed
    return true // FILTER.ALL
  })

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <p className="text-sm font-medium text-text-secondary">할 일이 없습니다</p>
        <p className="text-xs text-text-muted">새 할 일을 추가해보세요</p>
      </div>
    )
  }

  return (
    <ul className="space-y-2" aria-label="할 일 목록">
      {filtered.map((todo) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </ul>
  )
}
