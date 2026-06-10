import {
  DAY_LABELS,
  formatWeekRange,
  getDateKey,
  getWeekDates,
  isSupportedDate,
  isToday,
} from '../utils/date.js'

function ArrowIcon({ direction }) {
  const path = direction === 'left'
    ? 'M10 3L5 8L10 13'
    : 'M6 3L11 8L6 13'

  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d={path}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function WeekNavigator({
  weekStartDate,
  selectedDate,
  todoCountByDate,
  onSelectDate,
  onPrevWeek,
  onNextWeek,
}) {
  const weekDates = getWeekDates(weekStartDate)
  const selectedDateKey = getDateKey(selectedDate)

  return (
    <section
      aria-label="주간 뷰"
      className="mb-4 rounded-xl bg-surface p-4 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          aria-label="이전 주"
          onClick={onPrevWeek}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-primary-bg hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:bg-primary-bg active:text-primary-active"
        >
          <ArrowIcon direction="left" />
        </button>

        <p
          aria-live="polite"
          className="text-sm font-semibold text-text"
        >
          {formatWeekRange(weekDates[0], weekDates[6])}
        </p>

        <button
          type="button"
          aria-label="다음 주"
          onClick={onNextWeek}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-primary-bg hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:bg-primary-bg active:text-primary-active"
        >
          <ArrowIcon direction="right" />
        </button>
      </div>

      <div
        role="group"
        aria-label="날짜 선택"
        className="grid grid-cols-7 gap-1"
      >
        {weekDates.map((date) => {
          const dateKey = getDateKey(date)
          const count = todoCountByDate[dateKey] ?? 0
          const selected = dateKey === selectedDateKey
          const today = isToday(date)
          const supported = isSupportedDate(date)
          const dateLabel = `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${DAY_LABELS[date.getDay()]}요일`
          const accessibleLabel = supported
            ? `${dateLabel}${today ? ', 오늘' : ''}, 할 일 ${count}개`
            : `${dateLabel}, 지원 범위 밖`
          const stateClasses = selected
            ? 'bg-primary text-white hover:bg-primary-hover'
            : 'bg-surface text-text hover:bg-primary-bg hover:text-primary'

          return (
            <button
              key={dateKey}
              type="button"
              aria-label={accessibleLabel}
              aria-pressed={selected}
              disabled={!supported}
              onClick={() => onSelectDate(date)}
              className={`flex min-w-0 flex-col items-center rounded-lg px-1 py-2 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-30 ${stateClasses}`}
            >
              <span
                className={`text-xs ${today && !selected ? 'font-bold text-primary' : 'text-inherit'}`}
              >
                {DAY_LABELS[date.getDay()]}
              </span>
              <time
                dateTime={dateKey}
                className={`mt-0.5 text-base font-semibold max-[480px]:text-sm ${today && !selected ? 'text-primary' : 'text-inherit'}`}
              >
                {date.getDate()}
              </time>
              <span
                className={`mt-1 min-h-4 text-[10px] font-medium ${selected ? 'text-white/80' : 'text-text-secondary'}`}
                aria-hidden="true"
              >
                {count > 0 ? count : ''}
              </span>
              {today && (
                <span
                  className={`mt-0.5 rounded-full px-1.5 text-[9px] font-semibold ${selected ? 'bg-white text-primary' : 'bg-primary text-white'}`}
                >
                  오늘
                </span>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default WeekNavigator
