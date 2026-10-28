import type { ReactNode } from 'react'

import { AlertTopbar } from '@/features/alerts/alert-shared'
import { AskTapstate } from '@/features/ask-tapstate/ask-tapstate'
import { TawkFeedbackWidget } from '@/features/feedback/tawk-feedback-widget'
import { deploymentProfile } from '@/utils/deployment-profile'

import { AppSidebar } from './app-sidebar'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell text-foreground selection:bg-accent selection:text-accent-foreground font-sans">
      <AppSidebar />

      <main className="app-shell__main">
        <AlertTopbar />
        <div className="app-shell__content">{children}</div>
      </main>

      <AskTapstate />
      {deploymentProfile === 'cloud' ? <TawkFeedbackWidget /> : null}
    </div>
  )
}
