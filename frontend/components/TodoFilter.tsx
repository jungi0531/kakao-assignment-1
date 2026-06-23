'use client'

import { useRouter, usePathname } from 'next/navigation'
import { FILTER_ORDER, FILTER_LABELS, type FilterValue } from '@/types/todo'

interface TodoFilterProps {
  currentFilter: FilterValue
  selectedDate: string   // URL 파라미터를 유지하기 위해 필요
  weekStart: string
}

export default function TodoFilter({
  currentFilter,
  selectedDate,
  weekStart,
}: TodoFilterProps) {
  const router = useRouter()
  const pathname = usePathname()

  function handleFilterChange(filter: FilterValue) {
    const params = new URLSearchParams({ date: selectedDate, weekStart, filter })
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <nav aria-label="할 일 필터" className="mb-4">
      <div
        role="group"
        aria-label="필터 선택"
        className="flex rounded-lg bg-surface p-1 shadow-sm"
      >
        {FILTER_ORDER.map((filter) => {
          const isActive = filter === currentFilter
          return (
            <button
              key={filter}
              onClick={() => handleFilterChange(filter)}
              aria-pressed={isActive}
              className={[
                'flex-1 rounded-md py-1.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-secondary hover:text-text',
              ].join(' ')}
            >
              {FILTER_LABELS[filter]}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
