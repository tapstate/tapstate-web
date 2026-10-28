import type { ReactNode } from 'react'

export function ResourceListHeader({ title, children }: { title: string; children: ReactNode }) {
  return (
    <header className="border-divider-subtle z-10 flex min-h-14 shrink-0 flex-col justify-center gap-3 border-b bg-white px-4 py-3 md:flex-row md:items-center md:justify-between md:gap-3 md:px-6 md:py-0">
      <h1 className="text-text-primary min-w-0 truncate text-[15px] font-semibold">{title}</h1>
      <div className="flex flex-wrap items-center justify-end gap-2">{children}</div>
    </header>
  )
}
