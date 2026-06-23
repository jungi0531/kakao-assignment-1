// Backend API와 공유하는 Todo 데이터 형태
export interface Todo {
  id: number
  title: string
  completed: boolean
  date: string // "YYYY-MM-DD"
}

export const MAX_TODO_LENGTH = 100
export const EMPTY_TODO_ERROR = '할 일을 입력해주세요.'

// URL 파라미터 ?filter=all|active|completed 에 대응하는 상수
export const FILTER = {
  ALL: 'all',
  ACTIVE: 'active',
  COMPLETED: 'completed',
} as const

export type FilterValue = (typeof FILTER)[keyof typeof FILTER]

export const FILTER_LABELS: Record<FilterValue, string> = {
  [FILTER.ALL]: '전체',
  [FILTER.ACTIVE]: '진행 중',
  [FILTER.COMPLETED]: '완료',
}

export const FILTER_ORDER: FilterValue[] = [FILTER.ALL, FILTER.ACTIVE, FILTER.COMPLETED]
