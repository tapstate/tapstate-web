import type { ReactNode } from 'react'

import { AppSidebar } from './app-sidebar'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell text-foreground selection:bg-accent selection:text-accent-foreground font-sans">
      <AppSidebar />

      <main className="app-shell__main">
        <div className="app-shell__content">{children}</div>
      </main>
    </div>
  )
}
