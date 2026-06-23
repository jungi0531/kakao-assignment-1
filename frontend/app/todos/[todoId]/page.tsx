// Server Component: params(Promise)를 await해서 todoId를 추출 후 EditTodoForm에 내려줌
// actions.ts의 getTodo()로 실제 todo 데이터를 조회해 초기값으로 전달
// Client Component인 EditTodoForm을 분리한 이유:
//   - 입력 폼 상태(onChange, onSubmit)는 클라이언트가 필요하고
//   - 초기 데이터 조회는 서버에서 하는 것이 Next.js App Router의 권장 패턴

import { notFound } from 'next/navigation'
import Link from 'next/link'
import EditTodoForm from './EditTodoForm'
import { getTodo } from '@/app/actions'

interface Props {
  params: Promise<{ todoId: string }>
}

export default async function EditTodoPage({ params }: Props) {
  const { todoId } = await params
  const id = Number(todoId)

  // id가 숫자가 아닌 경우 404 처리
  if (isNaN(id)) notFound()

  const todo = await getTodo(id)
  if (!todo) notFound()
  const initialTitle = todo.title

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/todos"
          aria-label="뒤로 가기"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface"
        >
          ‹
        </Link>
        <h1 className="text-lg font-semibold text-text">할 일 수정</h1>
      </div>

      <EditTodoForm todoId={id} initialTitle={initialTitle} />
    </div>
  )
}
