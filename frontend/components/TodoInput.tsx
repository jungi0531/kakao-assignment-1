'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { MAX_TODO_LENGTH, EMPTY_TODO_ERROR } from '@/types/todo'

interface TodoInputProps {
  selectedDate: string // 어느 날짜의 할 일로 생성할지
}

export default function TodoInput({ selectedDate }: TodoInputProps) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const trimmed = title.trim()

    if (!trimmed) {
      setError(EMPTY_TODO_ERROR)
      inputRef.current?.focus()
      return
    }

    const res = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: trimmed, date: selectedDate }),
    })
    if (res.ok) {
      setTitle('')
      setError('')
      router.refresh()
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    // IME 조합 중일 때도 길이 제한 적용 (maxLength attribute로 처리)
    setTitle(value)
    if (error) setError('')
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4" noValidate>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={handleChange}
          maxLength={MAX_TODO_LENGTH}
          placeholder="할 일을 입력하세요"
          aria-label="새 할 일 입력"
          aria-invalid={!!error}
          aria-describedby={error ? 'todo-input-error' : undefined}
          className={[
            'flex-1 rounded-xl border bg-surface px-4 py-3 text-sm text-text outline-none',
            'placeholder:text-text-muted',
            'transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20',
            error ? 'border-danger' : 'border-border',
          ].join(' ')}
        />
        <button
          type="submit"
          className={[
            'rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white',
            'transition-colors hover:bg-primary-hover active:bg-primary-active',
            'focus-visible:outline-2 focus-visible:outline-primary',
          ].join(' ')}
        >
          추가
        </button>
      </div>
      {error && (
        <p
          id="todo-input-error"
          role="alert"
          className="mt-1.5 pl-1 text-xs text-danger"
        >
          {error}
        </p>
      )}
    </form>
  )
}
