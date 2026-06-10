export const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']
export const MIN_SUPPORTED_YEAR = 1000
export const MAX_SUPPORTED_YEAR = 9999

/**
 * 인수 date를 복사해 시간을 00:00:00으로 초기화한 새 Date를 반환한다.
 * 날짜 비교 시 시간 차이로 인한 오류를 방지하기 위해 사용한다.
 * @param {Date} date
 * @returns {Date}
 */
export function createMidnightDate(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Date 객체를 'YYYY-MM-DD' 형식의 문자열로 변환한다.
 * Todo의 date 필드 저장 및 비교에 사용한다.
 * @param {Date} date
 * @returns {string}
 */
export function getDateKey(date) {
  const y = String(date.getFullYear()).padStart(4, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * 주어진 날짜가 속한 주의 월요일 자정을 새 Date로 반환한다.
 * @param {Date} date
 * @returns {Date}
 */
export function getWeekStart(date) {
  const weekStart = createMidnightDate(date)
  const daysSinceMonday = weekStart.getDay() === 0
    ? 6
    : weekStart.getDay() - 1

  weekStart.setDate(weekStart.getDate() - daysSinceMonday)
  return weekStart
}

/**
 * 월요일부터 일요일까지 7개의 새 Date를 반환한다.
 * @param {Date} weekStartDate
 * @returns {Date[]}
 */
export function getWeekDates(weekStartDate) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = createMidnightDate(weekStartDate)
    date.setDate(date.getDate() + index)
    return date
  })
}

/**
 * date가 weekStartDate부터 6일 사이에 포함되는지 확인한다.
 * @param {Date} date
 * @param {Date} weekStartDate
 * @returns {boolean}
 */
export function isDateInWeek(date, weekStartDate) {
  const dateTime = createMidnightDate(date).getTime()
  const weekDates = getWeekDates(weekStartDate)
  const startTime = weekDates[0].getTime()
  const endTime = weekDates[6].getTime()

  return dateTime >= startTime && dateTime <= endTime
}

/**
 * 저장 및 날짜 이동에 사용할 수 있는 유효한 Date인지 확인한다.
 * @param {Date} date
 * @returns {boolean}
 */
export function isSupportedDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return false
  }

  const year = date.getFullYear()
  return year >= MIN_SUPPORTED_YEAR && year <= MAX_SUPPORTED_YEAR
}

/**
 * 'YYYY-MM-DD' 저장 키를 로컬 자정 기준 Date로 변환한다.
 * 형식, 실제 달력 날짜, 지원 연도 범위를 모두 만족하지 않으면 null을 반환한다.
 * @param {unknown} value
 * @returns {Date | null}
 */
export function parseDateKey(value) {
  if (
    typeof value !== 'string'
    || !/^(?:[1-9]\d{3})-\d{2}-\d{2}$/.test(value)
  ) {
    return null
  }

  const [year, month, day] = value.split('-').map(Number)
  const parsedDate = createMidnightDate(new Date(year, month - 1, day))

  if (!isSupportedDate(parsedDate) || getDateKey(parsedDate) !== value) {
    return null
  }

  return parsedDate
}

/**
 * 표시 주간의 월요일로 사용할 수 있는 Date인지 확인한다.
 * 지원 날짜 경계와 일부라도 겹치는 주는 허용한다.
 * @param {Date} date
 * @returns {boolean}
 */
export function isSupportedWeekStart(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return false
  }

  const normalizedDate = createMidnightDate(date)

  return normalizedDate.getDay() === 1
    && getWeekDates(normalizedDate).some(isSupportedDate)
}

/**
 * 주 시작 저장 키를 월요일 Date로 변환한다.
 * 선택 날짜보다 넓은 경계 주 표현을 위해 4자리 연도 형식만 검사한다.
 * @param {unknown} value
 * @returns {Date | null}
 */
export function parseWeekStartKey(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null
  }

  const [year, month, day] = value.split('-').map(Number)
  const parsedDate = createMidnightDate(new Date(year, month - 1, day))

  if (
    getDateKey(parsedDate) !== value
    || !isSupportedWeekStart(parsedDate)
  ) {
    return null
  }

  return parsedDate
}

/**
 * 주어진 날짜가 오늘인지 반환한다.
 * @param {Date} date
 * @returns {boolean}
 */
export function isToday(date) {
  return getDateKey(date) === getDateKey(new Date())
}

/**
 * 표시용 날짜 문자열을 반환한다.
 * 올해면 "M월 D일 (요일)", 다른 연도면 "YYYY년 M월 D일 (요일)" 형식.
 * @param {Date} date
 * @returns {string}
 */
export function formatDisplayDate(date) {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const dayLabel = DAY_LABELS[date.getDay()]

  if (year === new Date().getFullYear()) {
    return `${month}월 ${day}일 (${dayLabel})`
  }
  return `${year}년 ${month}월 ${day}일 (${dayLabel})`
}

/**
 * 주간 헤더에 표시할 날짜 범위를 반환한다.
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {string}
 */
export function formatWeekRange(startDate, endDate) {
  const currentYear = new Date().getFullYear()
  const startYear = startDate.getFullYear()
  const endYear = endDate.getFullYear()
  const startLabel = `${startDate.getMonth() + 1}월 ${startDate.getDate()}일`
  const endLabel = `${endDate.getMonth() + 1}월 ${endDate.getDate()}일`

  if (startYear !== endYear) {
    return `${startYear}년 ${startLabel} - ${endYear}년 ${endLabel}`
  }

  if (startYear !== currentYear) {
    return `${startYear}년 ${startLabel} - ${endLabel}`
  }

  return `${startLabel} - ${endLabel}`
}
