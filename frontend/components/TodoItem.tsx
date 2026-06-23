'use client'

import { useRouter } from 'next/navigation'
import type { Todo } from '@/types/todo'

interface TodoItemProps {
  todo: Todo
}

export default function TodoItem({ todo }: TodoItemProps) {
  const router = useRouter()

  async function handleToggle() {
    const res = await fetch(`/api/todos/${todo.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !todo.completed }),
    })
    if (res.ok) router.refresh()
  }

  async function handleDelete() {
    const res = await fetch(`/api/todos/${todo.id}`, { method: 'DELETE' })
    if (res.ok) router.refresh()
  }

  function handleEdit() {
    router.push(`/todos/${todo.id}`)
  }

  return (
    <li className="flex items-center gap-3 rounded-xl bg-surface p-4 shadow-sm transition-shadow hover:shadow-md">
      {/* 완료 체크박스 */}
      <button
        onClick={handleToggle}
        aria-label={todo.completed ? '완료 취소' : '완료로 표시'}
        aria-pressed={todo.completed}
        className={[
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
          todo.completed
            ? 'border-primary bg-primary text-white'
            : 'border-border hover:border-primary',
        ].join(' ')}
      >
        {todo.completed && (
          <svg
            viewBox="0 0 12 10"
            fill="none"
            className="h-3 w-3"
            aria-hidden="true"
          >
            <path
              d="M1 5l3.5 3.5L11 1"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {/* 제목 */}
      <span
        className={[
          'flex-1 text-sm leading-snug',
          todo.completed ? 'text-text-muted line-through' : 'text-text',
        ].join(' ')}
      >
        {todo.title}
      </span>

      {/* 수정 / 삭제 버튼 */}
      <div className="flex shrink-0 gap-1">
        <button
          onClick={handleEdit}
          aria-label={`"${todo.title}" 수정`}
          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-background hover:text-text"
        >
          수정
        </button>
        <button
          onClick={handleDelete}
          aria-label={`"${todo.title}" 삭제`}
          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger-bg"
        >
          삭제
        </button>
      </div>
    </li>
  )
}
