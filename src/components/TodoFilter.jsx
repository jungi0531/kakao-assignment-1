import { FILTER_LABELS, FILTER_ORDER } from '../constants/todo.js'

function TodoFilter({ filter, onFilterChange }) {
  return (
    <fieldset className="mb-4 w-full min-w-0 flex gap-1 rounded-xl border-0 bg-surface p-1 shadow-sm">
      <legend className="sr-only">할 일 필터</legend>
      {FILTER_ORDER.map((value) => {
        const isSelected = filter === value
        return (
          <label key={value} className="flex-1 cursor-pointer">
            {/* sr-only로 숨긴 radio에 peer를 부여해 label의 span이 focus-visible 스타일을 상속받도록 함 */}
            <input
              type="radio"
              name="todo-filter"
              value={value}
              checked={isSelected}
              onChange={() => onFilterChange(value)}
              className="sr-only peer"
            />
            <span
              className={[
                'block rounded-lg px-3 py-2 text-center text-sm font-medium transition-all duration-150',
                'peer-focus-visible:outline-[3px_solid_rgb(103_43_224/30%)] peer-focus-visible:outline-offset-2',
                isSelected
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-secondary hover:bg-primary-bg hover:text-primary',
              ].join(' ')}
            >
              {FILTER_LABELS[value]}
            </span>
          </label>
        )
      })}
    </fieldset>
  )
}

export default TodoFilter
