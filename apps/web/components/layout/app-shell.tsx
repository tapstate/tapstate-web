import type { ReactNode } from 'react'

import { TawkFeedbackWidget } from '@/features/feedback/tawk-feedback-widget'
import { deploymentProfile } from '@/utils/deployment-profile'

import { AppSidebar } from './app-sidebar'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell text-foreground selection:bg-accent selection:text-accent-foreground font-sans">
      <AppSidebar />

      <main className="app-shell__main">
        <div className="app-shell__content">{children}</div>
      </main>

      {deploymentProfile === 'cloud' ? <TawkFeedbackWidget /> : null}
    </div>
  )
}
