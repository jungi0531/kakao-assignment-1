import { useRef, useState } from 'react'
import {
  EMPTY_TODO_ERROR,
  MAX_TODO_LENGTH,
} from '../constants/todo.js'

function TodoInput({ onAddTodo }) {
  const [inputText, setInputText] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const inputRef = useRef(null)

  const handleInputChange = (event) => {
    const nextText = event.target.value
    setInputText(nextText)

    if (errorMessage && nextText.trim()) {
      setErrorMessage('')
    }
  }

  const handleKeyDown = (event) => {
    // IME 조합 중 Enter는 글자 확정 동작이므로 폼 제출로 처리하지 않는다.
    if (event.key === 'Enter' && event.nativeEvent.isComposing) {
      event.preventDefault()
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!inputText.trim()) {
      setErrorMessage(EMPTY_TODO_ERROR)
      inputRef.current?.focus()
      return
    }

    onAddTodo(inputText)
    setInputText('')
    setErrorMessage('')
  }

  const errorId = errorMessage ? 'todo-input-error' : undefined

  return (
    <section className="mb-5" aria-labelledby="todo-input-heading">
      <h2 id="todo-input-heading" className="sr-only">
        할 일 추가
      </h2>

      <form className="flex gap-2" onSubmit={handleSubmit} noValidate>
        <label htmlFor="todo-input" className="sr-only">
          할 일
        </label>
        <input
          ref={inputRef}
          id="todo-input"
          className="h-12 min-w-0 flex-1 rounded-[10px] border-[1.5px] border-border bg-surface px-4 text-base text-text outline-none transition placeholder:text-text-muted focus-visible:border-primary focus-visible:shadow-[0_0_0_3px_rgb(103_43_224/12%)] aria-[invalid=true]:border-danger aria-[invalid=true]:shadow-[0_0_0_3px_rgb(255_59_48/12%)]"
          type="text"
          value={inputText}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="할 일을 입력하세요..."
          maxLength={MAX_TODO_LENGTH}
          aria-invalid={Boolean(errorMessage)}
          aria-describedby={errorId}
        />
        <button
          className="h-12 shrink-0 cursor-pointer rounded-[10px] bg-primary px-5 text-base font-semibold whitespace-nowrap text-white transition hover:bg-primary-hover active:bg-primary-active active:scale-[0.97] focus-visible:outline-[3px_solid_rgb(103_43_224/30%)] focus-visible:outline-offset-2 max-[480px]:px-4"
          type="submit"
        >
          추가
        </button>
      </form>

      <p
        id="todo-input-error"
        className="mt-2 min-h-5 pl-1 text-sm text-danger"
        role={errorMessage ? 'alert' : undefined}
        aria-live="polite"
      >
        {errorMessage}
      </p>
    </section>
  )
}

export default TodoInput
