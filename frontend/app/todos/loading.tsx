// todos/page.tsx가 async 데이터를 기다리는 동안 자동으로 렌더링되는 스켈레톤
// Next.js가 이 파일을 Suspense fallback으로 자동 사용함
export default function Loading() {
  return (
    <div className="animate-pulse space-y-4">
      {/* 주간 네비게이터 스켈레톤 */}
      <div className="h-[148px] rounded-xl bg-surface" />
      {/* 입력창 스켈레톤 */}
      <div className="h-12 rounded-xl bg-surface" />
      {/* 필터 탭 스켈레톤 */}
      <div className="h-10 rounded-lg bg-surface" />
      {/* 목록 스켈레톤 */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-surface" />
        ))}
      </div>
    </div>
  )
}
