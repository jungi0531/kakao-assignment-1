// 날짜를 "YYYY-MM-DD" 형식 문자열로 변환
export function getDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// "YYYY-MM-DD" 문자열을 로컬 자정 기준 Date 객체로 파싱
// new Date("YYYY-MM-DD")는 UTC 기준으로 파싱돼 시간대에 따라 날짜가 달라질 수 있으므로 직접 파싱
export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  // 잘못된 입력(NaN 등)이 들어오면 오늘 날짜로 안전하게 폴백
  return isNaN(date.getTime()) ? new Date() : date
}

// 해당 날짜가 속한 주의 월요일을 반환 (일요일은 -6일, 그 외엔 월요일 기준 조정)
export function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay() // 0=일, 1=월, ..., 6=토
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

// weekStart(월요일)부터 7일치 Date 배열 반환
export function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })
}

// 주어진 날짜가 오늘인지 확인
export function isToday(date: Date): boolean {
  const today = new Date()
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  )
}

// 주간 범위 레이블 반환 — 예: "6월 16일 – 22일" 또는 월이 달라질 때 "6월 30일 – 7월 6일"
export function formatWeekRange(weekStart: Date): string {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const startMonth = weekStart.getMonth() + 1
  const endMonth = weekEnd.getMonth() + 1
  const startDay = weekStart.getDate()
  const endDay = weekEnd.getDate()
  if (startMonth === endMonth) {
    return `${startMonth}월 ${startDay}일 – ${endDay}일`
  }
  return `${startMonth}월 ${startDay}일 – ${endMonth}월 ${endDay}일`
}

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'] as const

// 날짜의 요일 레이블 반환 — 예: "월"
export function getDayLabel(date: Date): string {
  const day = date.getDay() // 0=일, 1=월, ..., 6=토
  const index = day === 0 ? 6 : day - 1
  return DAY_LABELS[index]
}
