import { redirect } from 'next/navigation'

// 루트 접속 시 Todo 목록 페이지로 바로 이동
export default function Home() {
  redirect('/todos')
}
