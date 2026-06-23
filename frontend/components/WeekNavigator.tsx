'use client'

import { useRouter, usePathname } from 'next/navigation'
import {
  parseDateKey,
  getDateKey,
  getWeekDates,
  getWeekStart,
  isToday,
  formatWeekRange,
  getDayLabel,
} from '@/lib/date'

interface WeekNavigatorProps {
  // todos/page.tsx(Server)에서 searchParams를 파싱해 내려줌
  selectedDate: string    // "YYYY-MM-DD"
  weekStart: string       // "YYYY-MM-DD" (항상 월요일)
  currentFilter: string   // 날짜/주 이동 시 filter 파라미터를 유지하기 위해 필요
  todoCountByDate: Record<string, number> // Step 5에서 API 연동 후 채워짐
}

export default function WeekNavigator({
  selectedDate,
  weekStart,
  currentFilter,
  todoCountByDate,
}: WeekNavigatorProps) {
  const router = useRouter()
  const pathname = usePathname()

  const weekStartDate = parseDateKey(weekStart)
  const weekDates = getWeekDates(weekStartDate)

  // URL 파라미터를 유지하면서 특정 key만 변경하는 헬퍼
  // filter도 포함해야 날짜/주 이동 시 선택한 필터가 초기화되지 않음
  function buildUrl(updates: Record<string, string>): string {
    const params = new URLSearchParams({
      date: selectedDate,
      weekStart,
      filter: currentFilter,
    })
    for (const [key, value] of Object.entries(updates)) {
      params.set(key, value)
    }
    return `${pathname}?${params.toString()}`
  }

  function handleDateSelect(date: Date) {
    router.push(buildUrl({ date: getDateKey(date) }))
  }

  function handlePrevWeek() {
    const prevStart = new Date(weekStartDate)
    prevStart.setDate(prevStart.getDate() - 7)
    router.push(
      buildUrl({
        weekStart: getDateKey(prevStart),
        date: getDateKey(prevStart), // 이전 주의 첫 날(월)로 이동
      }),
    )
  }

  function handleNextWeek() {
    const nextStart = new Date(weekStartDate)
    nextStart.setDate(nextStart.getDate() + 7)
    router.push(
      buildUrl({
        weekStart: getDateKey(nextStart),
        date: getDateKey(nextStart),
      }),
    )
  }

  const today = new Date()
  const currentWeekStart = getDateKey(getWeekStart(today))
  const isCurrentWeek = weekStart === currentWeekStart

  return (
    <section
      aria-label="주간 날짜 네비게이터"
      className="mb-4 rounded-xl bg-surface p-4 shadow-sm"
    >
      {/* 주간 범위 레이블 + 이전/다음 버튼 */}
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={handlePrevWeek}
          aria-label="이전 주"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-background hover:text-text"
        >
          ‹
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text">
            {formatWeekRange(weekStartDate)}
          </span>
          {!isCurrentWeek && (
            <button
              onClick={() => {
                const todayKey = getDateKey(today)
                router.push(
                  buildUrl({ date: todayKey, weekStart: currentWeekStart }),
                )
              }}
              className="rounded px-2 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary-bg"
            >
              오늘
            </button>
          )}
        </div>

        <button
          onClick={handleNextWeek}
          aria-label="다음 주"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-background hover:text-text"
        >
          ›
        </button>
      </div>

      {/* 7일 날짜 버튼 */}
      <div className="grid grid-cols-7 gap-1" role="group" aria-label="날짜 선택">
        {weekDates.map((date) => {
          const dateKey = getDateKey(date)
          const isSelected = dateKey === selectedDate
          const isTodayDate = isToday(date)
          const count = todoCountByDate[dateKey] ?? 0

          return (
            <button
              key={dateKey}
              onClick={() => handleDateSelect(date)}
              aria-label={`${dateKey}${isTodayDate ? ' (오늘)' : ''}${isSelected ? ' (선택됨)' : ''}`}
              aria-pressed={isSelected}
              className={[
                'flex flex-col items-center gap-1 rounded-lg py-2 transition-colors',
                isSelected
                  ? 'bg-primary text-white'
                  : 'text-text hover:bg-background',
              ].join(' ')}
            >
              <span className="text-[11px] font-medium opacity-70">
                {getDayLabel(date)}
              </span>
              <span
                className={[
                  'text-sm font-semibold leading-none',
                  !isSelected && isTodayDate ? 'text-primary' : '',
                ].join(' ')}
              >
                {date.getDate()}
              </span>
              {/* 할 일 개수 뱃지 */}
              <span
                className={[
                  'flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold',
                  count > 0
                    ? isSelected
                      ? 'bg-white/30 text-white'
                      : 'bg-primary-bg text-primary'
                    : 'opacity-0', // 0개면 자리만 차지하게 투명하게
                ].join(' ')}
                aria-hidden="true"
              >
                {count > 0 ? count : ''}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
