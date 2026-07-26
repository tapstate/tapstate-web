import type { ReactNode } from 'react'
import { AppHeader } from './app-header'
import { AppSidebar } from './app-sidebar'
import { AskTapstate } from '@/features/ask-tapstate/ask-tapstate'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="default-layout-root">
      <div className="app-shell">
        <div className="app-shell__wash" aria-hidden="true" />
        <AppSidebar />

        <div className="app-shell__body">
          <AppHeader />

          <main className="app-shell__main">
            <div className="app-shell__panel">{children}</div>
          </main>
        </div>

        <AskTapstate />
      </div>
    </div>
  )
}
