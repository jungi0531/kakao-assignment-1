'use client'

// Client Component: 입력 폼 상태(onChange, onSubmit)가 필요하기 때문
// POST /api/todos 호출 후 /todos로 리다이렉트

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MAX_TODO_LENGTH, EMPTY_TODO_ERROR } from '@/types/todo'
import { getDateKey } from '@/lib/date'

export default function NewTodoPage() {
  const router = useRouter()
  const today = getDateKey(new Date())

  const [title, setTitle] = useState('')
  const [date, setDate] = useState(today)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const trimmed = title.trim()
    if (!trimmed) {
      setError(EMPTY_TODO_ERROR)
      return
    }

    const res = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: trimmed, date }),
    })
    if (res.ok) router.push('/todos')
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => router.push('/todos')}
          aria-label="뒤로 가기"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface"
        >
          ‹
        </button>
        <h1 className="text-lg font-semibold text-text">할 일 추가</h1>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* 제목 입력 */}
        <div className="space-y-1.5">
          <label
            htmlFor="new-todo-title"
            className="text-sm font-medium text-text-secondary"
          >
            할 일
          </label>
          <input
            id="new-todo-title"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              if (error) setError('')
            }}
            maxLength={MAX_TODO_LENGTH}
            placeholder="할 일을 입력하세요"
            autoFocus
            aria-invalid={!!error}
            aria-describedby={error ? 'new-todo-error' : undefined}
            className={[
              'w-full rounded-xl border bg-surface px-4 py-3 text-sm text-text outline-none',
              'placeholder:text-text-muted',
              'transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20',
              error ? 'border-danger' : 'border-border',
            ].join(' ')}
          />
          {error && (
            <p id="new-todo-error" role="alert" className="text-xs text-danger">
              {error}
            </p>
          )}
        </div>

        {/* 날짜 선택 */}
        <div className="space-y-1.5">
          <label
            htmlFor="new-todo-date"
            className="text-sm font-medium text-text-secondary"
          >
            날짜
          </label>
          <input
            id="new-todo-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* 제출 버튼 */}
        <button
          type="submit"
          className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover active:bg-primary-active"
        >
          추가
        </button>
      </form>
    </div>
  )
}
