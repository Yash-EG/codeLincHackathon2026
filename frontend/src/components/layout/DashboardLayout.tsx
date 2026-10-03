import type { ReactNode } from 'react'

interface DashboardLayoutProps {
  header: ReactNode
  /** Left column: stats strip + 3D stage. */
  main: ReactNode
  /** Right column: AI assistant / cost breakdown. */
  sidebar: ReactNode
}

/**
 * Full-viewport dashboard shell. On large screens the page never scrolls:
 * the stage and the sidebar each fill the remaining height. Below `lg` the
 * columns stack and the page scrolls normally.
 */
export default function DashboardLayout({ header, main, sidebar }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      {header}
      <div className="grid flex-1 gap-4 p-4 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(380px,440px)] lg:gap-5 lg:p-5">
        <main className="flex min-w-0 flex-col gap-4 lg:min-h-0 lg:gap-5">{main}</main>
        <aside className="flex h-[680px] min-w-0 flex-col lg:h-auto lg:min-h-0">{sidebar}</aside>
      </div>
    </div>
  )
}
