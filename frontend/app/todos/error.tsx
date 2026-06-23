'use client'

// Next.js 요구사항: error.tsx는 반드시 Client Component
// React Error Boundary는 클라이언트 측에서만 동작하기 때문
// 에러 발생 시 흰 화면 대신 이 컴포넌트가 렌더링됨

import { useEffect } from 'react'

interface ErrorProps {
  error: Error & { digest?: string }
  // Next.js 16: reset이 아니라 unstable_retry
  unstable_retry: () => void
}

export default function Error({ error, unstable_retry }: ErrorProps) {
  useEffect(() => {
    // 실제 프로덕션에서는 Sentry 같은 에러 추적 서비스로 전송
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl bg-danger-bg p-8 text-center">
      <p className="text-base font-semibold text-danger">오류가 발생했습니다</p>
      <p className="text-sm text-text-secondary">{error.message || '잠시 후 다시 시도해주세요.'}</p>
      <button
        onClick={unstable_retry}
        className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-80"
      >
        다시 시도
      </button>
    </div>
  )
}
