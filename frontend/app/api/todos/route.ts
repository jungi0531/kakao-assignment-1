// HTTP 프록시 — Client Component의 fetch('/api/todos') 요청을 FastAPI로 중계
// Client Component는 FastAPI URL 대신 이 엔드포인트를 호출한다
// 뮤테이션 성공 시 revalidatePath로 Server Component 캐시를 무효화한다

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

const BACKEND_URL = process.env.BACKEND_URL
if (!BACKEND_URL) throw new Error('BACKEND_URL이 설정되지 않았습니다. .env.local을 확인하세요.')

// GET /api/todos?date=YYYY-MM-DD
export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get('date')
  const url = date
    ? `${BACKEND_URL}/todos?date=${encodeURIComponent(date)}`
    : `${BACKEND_URL}/todos`
  const res = await fetch(url)
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

// POST /api/todos — 새 Todo 생성
export async function POST(request: NextRequest) {
  const body = await request.json()
  const res = await fetch(`${BACKEND_URL}/todos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (res.ok) revalidatePath('/todos')
  return NextResponse.json(data, { status: res.status })
}
