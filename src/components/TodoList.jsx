import TodoItem from './TodoItem.jsx'

function TodoList({
  todos,
  totalCount,
  editingId,
  onToggleTodo,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDeleteTodo,
}) {
  const isEmpty = todos.length === 0

  return (
    <section aria-labelledby="todo-list-heading">
      <h2 id="todo-list-heading" className="sr-only">
        할 일 목록
      </h2>

      {/*
        role="status"를 항상 DOM에 유지해, 조건부 마운트 시 일부 스크린리더가
        라이브 리전을 인식하지 못하는 문제를 방지한다.
      */}
      <div role="status" aria-live="polite" aria-atomic="true">
        {isEmpty && (
          <div className="py-12 text-center text-sm leading-7 text-text-secondary">
            <p>{totalCount === 0 ? '할 일이 없습니다.' : '해당하는 할 일이 없습니다.'}</p>
            {totalCount === 0 && <p>새로운 할 일을 추가해보세요!</p>}
          </div>
        )}
      </div>

      {!isEmpty && (
        <ul className="flex list-none flex-col gap-2">
          {todos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              isEditing={editingId === todo.id}
              onToggleTodo={onToggleTodo}
              onStartEdit={onStartEdit}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
              onDeleteTodo={onDeleteTodo}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

export default TodoList
