import { useEffect, useRef, useState } from 'react'
import {
  EMPTY_TODO_ERROR,
  MAX_TODO_LENGTH,
} from '../constants/todo.js'

function TodoItem({
  todo,
  isEditing,
  onToggleTodo,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDeleteTodo,
}) {
  const [editText, setEditText] = useState(todo.text)
  const [editError, setEditError] = useState('')
  const editInputRef = useRef(null)

  useEffect(() => {
    if (!isEditing) {
      return
    }

    const editInput = editInputRef.current
    editInput?.focus()
    editInput?.setSelectionRange(editInput.value.length, editInput.value.length)
  }, [isEditing])

  const handleStartEdit = () => {
    // 저장된 최신 텍스트를 기준으로 매 편집 세션의 draft를 초기화한다.
    setEditText(todo.text)
    setEditError('')
    onStartEdit(todo.id)
  }

  const handleEditChange = (event) => {
    const nextText = event.target.value
    setEditText(nextText)

    if (editError && nextText.trim()) {
      setEditError('')
    }
  }

  const handleSaveEdit = () => {
    if (!editText.trim()) {
      setEditError(EMPTY_TODO_ERROR)
      editInputRef.current?.focus()
      return
    }

    onSaveEdit(todo.id, editText)
  }

  const handleCancelEdit = () => {
    setEditText(todo.text)
    setEditError('')
    onCancelEdit()
  }

  const handleEditKeyDown = (event) => {
    if (event.nativeEvent.isComposing) {
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      handleSaveEdit()
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      handleCancelEdit()
    }
  }

  const editErrorId = editError ? `todo-edit-error-${todo.id}` : undefined

  return (
    <li
      className={`flex gap-3 rounded-[14px] border-[1.5px] border-border bg-surface p-4 shadow-sm transition hover:border-[#d0d0d8] hover:shadow-[0_4px_12px_rgb(0_0_0/8%)] max-[480px]:flex-wrap max-[480px]:gap-2 max-[480px]:p-3 ${isEditing ? 'items-start' : 'items-center'} ${todo.completed ? 'is-completed opacity-60' : ''}`}
    >
      <div
        className={`relative size-[22px] shrink-0${isEditing ? ' mt-[3px]' : ''}`}
      >
        <input
          className="peer size-full cursor-pointer appearance-none rounded-md border-2 border-border bg-surface transition hover:border-primary checked:border-primary checked:bg-primary focus-visible:outline-[3px_solid_rgb(103_43_224/30%)] focus-visible:outline-offset-2"
          type="checkbox"
          checked={todo.completed}
          onChange={() => onToggleTodo(todo.id)}
          aria-label={
            todo.completed
              ? `완료 취소: ${todo.text}`
              : `완료로 표시: ${todo.text}`
          }
        />
        <svg
          viewBox="0 0 12 12"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 m-auto size-3 text-white opacity-0 transition-opacity peer-checked:opacity-100"
        >
          <path
            d="M2 6.2 4.7 9 10 3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {isEditing ? (
        <div className="min-w-0 flex-1 max-[480px]:w-[calc(100%-34px)]">
          <label htmlFor={`todo-edit-${todo.id}`} className="sr-only">
            할 일 수정
          </label>
          <input
            ref={editInputRef}
            id={`todo-edit-${todo.id}`}
            className="w-full rounded-md border-[1.5px] border-primary bg-primary-bg px-3 py-1 text-base text-text outline-none transition shadow-[0_0_0_3px_rgb(103_43_224/12%)] aria-[invalid=true]:border-danger aria-[invalid=true]:bg-danger-bg aria-[invalid=true]:shadow-[0_0_0_3px_rgb(255_59_48/12%)]"
            type="text"
            value={editText}
            onChange={handleEditChange}
            onKeyDown={handleEditKeyDown}
            maxLength={MAX_TODO_LENGTH}
            aria-invalid={Boolean(editError)}
            aria-describedby={editErrorId}
          />
          {editError && (
            <p id={editErrorId} className="mt-1 pl-1 text-sm text-danger" role="alert">
              {editError}
            </p>
          )}
        </div>
      ) : (
        <span
          className={`todo-text min-w-0 flex-1 break-words text-base leading-6 max-[480px]:w-[calc(100%-34px)] ${todo.completed ? 'text-text-muted line-through' : 'text-text'}`}
        >
          {todo.text}
        </span>
      )}

      <div
        className={`flex shrink-0 gap-1 max-[480px]:ml-[34px] max-[480px]:w-full${isEditing ? ' mt-[3px]' : ''}`}
      >
        {isEditing ? (
          <button
            className="h-8 cursor-pointer rounded-md px-2 text-sm font-semibold transition active:scale-[0.94] focus-visible:outline-[3px_solid_rgb(103_43_224/30%)] focus-visible:outline-offset-2 bg-primary-bg text-primary hover:bg-primary hover:text-white"
            type="button"
            onClick={handleSaveEdit}
          >
            저장
          </button>
        ) : (
          <button
            className="h-8 cursor-pointer rounded-md px-2 text-sm font-semibold transition active:scale-[0.94] focus-visible:outline-[3px_solid_rgb(103_43_224/30%)] focus-visible:outline-offset-2 bg-transparent text-text-secondary hover:bg-primary-bg hover:text-primary"
            type="button"
            onClick={handleStartEdit}
            aria-label={`수정: ${todo.text}`}
          >
            수정
          </button>
        )}
        <button
          className="h-8 cursor-pointer rounded-md px-2 text-sm font-semibold transition active:scale-[0.94] focus-visible:outline-[3px_solid_rgb(103_43_224/30%)] focus-visible:outline-offset-2 bg-transparent text-text-muted hover:bg-danger-bg hover:text-danger"
          type="button"
          onClick={() => onDeleteTodo(todo.id)}
          aria-label={`삭제: ${todo.text}`}
        >
          삭제
        </button>
      </div>
    </li>
  )
}

export default TodoItem
