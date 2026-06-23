'use server'

// Server Actions — 서버에서 직접 FastAPI를 호출하는 함수들
// 'use server'를 파일 최상단에 선언하면 모든 export 함수가 Server Action이 된다
// Server Component에서 import해서 직접 호출하며, 브라우저는 FastAPI URL을 알 수 없다

import type { Todo } from '@/types/todo'

const BACKEND_URL = process.env.BACKEND_URL
if (!BACKEND_URL) throw new Error('BACKEND_URL이 설정되지 않았습니다. .env.local을 확인하세요.')

// 전체 또는 특정 날짜의 Todo 목록 조회
// date 없이 호출하면 전체 Todo 반환 (주간 카운트 집계용)
export async function getTodos(date?: string): Promise<Todo[]> {
  const url = date
    ? `${BACKEND_URL}/todos?date=${encodeURIComponent(date)}`
    : `${BACKEND_URL}/todos`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error('할 일 목록을 불러오지 못했습니다.')
  return res.json()
}

// 단건 조회 — 수정 페이지 초기값 로드에 사용
// 존재하지 않는 id면 null 반환 (호출부에서 notFound() 처리)
export async function getTodo(id: number): Promise<Todo | null> {
  const res = await fetch(`${BACKEND_URL}/todos/${id}`, { cache: 'no-store' })
  if (res.status === 404) return null
  if (!res.ok) throw new Error('할 일을 불러오지 못했습니다.')
  return res.json()
}
