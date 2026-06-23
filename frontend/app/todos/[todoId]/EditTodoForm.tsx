'use client'

// Client Component: 입력 폼 상태(onChange, onSubmit)가 필요하기 때문
// page.tsx(Server)에서 API로 조회한 실제 제목을 prop으로 받아 렌더링

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MAX_TODO_LENGTH, EMPTY_TODO_ERROR } from '@/types/todo'

interface EditTodoFormProps {
  todoId: number
  initialTitle: string
}

export default function EditTodoForm({ todoId, initialTitle }: EditTodoFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState(initialTitle)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const trimmed = title.trim()
    if (!trimmed) {
      setError(EMPTY_TODO_ERROR)
      return
    }

    const res = await fetch(`/api/todos/${todoId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: trimmed }),
    })
    if (res.ok) router.push('/todos')
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="space-y-1.5">
        <label
          htmlFor="edit-todo-title"
          className="text-sm font-medium text-text-secondary"
        >
          할 일
        </label>
        <input
          id="edit-todo-title"
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            if (error) setError('')
          }}
          maxLength={MAX_TODO_LENGTH}
          placeholder="수정할 내용을 입력하세요"
          autoFocus
          aria-invalid={!!error}
          aria-describedby={error ? 'edit-todo-error' : undefined}
          className={[
            'w-full rounded-xl border bg-surface px-4 py-3 text-sm text-text outline-none',
            'placeholder:text-text-muted',
            'transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20',
            error ? 'border-danger' : 'border-border',
          ].join(' ')}
        />
        {error && (
          <p id="edit-todo-error" role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}
      </div>

      <button
        type="submit"
        className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover active:bg-primary-active"
      >
        저장
      </button>
    </form>
  )
}
