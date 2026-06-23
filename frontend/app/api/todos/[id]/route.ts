// HTTP 프록시 — id가 URL에 포함되는 요청(PUT, DELETE)을 FastAPI로 중계
// Next.js 16: route handler의 params도 Promise이므로 await 필요

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

const BACKEND_URL = process.env.BACKEND_URL
if (!BACKEND_URL) throw new Error('BACKEND_URL이 설정되지 않았습니다. .env.local을 확인하세요.')

interface RouteParams {
  params: Promise<{ id: string }>
}

// PUT /api/todos/[id] — 제목 수정 또는 완료 상태 토글
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const body = await request.json()
  const res = await fetch(`${BACKEND_URL}/todos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (res.ok) revalidatePath('/todos')
  return NextResponse.json(data, { status: res.status })
}

// DELETE /api/todos/[id] — Todo 삭제
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const res = await fetch(`${BACKEND_URL}/todos/${id}`, { method: 'DELETE' })
  if (res.ok) revalidatePath('/todos')
  // FastAPI는 204 No Content를 반환하므로 body 없이 응답
  return new NextResponse(null, { status: res.status })
}
