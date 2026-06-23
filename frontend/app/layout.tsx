import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'My Tasks',
  description: '주간 단위 할 일 관리 앱',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full bg-background text-text antialiased">
        <div className="mx-auto max-w-[600px] px-4 py-8">{children}</div>
      </body>
    </html>
  )
}
