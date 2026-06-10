export const EMPTY_TODO_ERROR = '할 일을 입력해주세요.'
export const MAX_TODO_LENGTH = 100

export const FILTER = {
  ALL: 'all',
  ACTIVE: 'active',
  COMPLETED: 'completed',
}

export const FILTER_LABELS = {
  [FILTER.ALL]: '전체',
  [FILTER.ACTIVE]: '진행 중',
  [FILTER.COMPLETED]: '완료',
}

// Object.values 순서에 의존하지 않도록 렌더링 순서를 명시적으로 선언
export const FILTER_ORDER = [FILTER.ALL, FILTER.ACTIVE, FILTER.COMPLETED]
