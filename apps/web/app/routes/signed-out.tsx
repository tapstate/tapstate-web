import { createFileRoute, Navigate } from '@tanstack/react-router'
import { ArrowRight, LogOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { replaceWithCloudConsole } from '@/utils/cloud-console'
import { deploymentProfile } from '@/utils/deployment-profile'

export const Route = createFileRoute('/signed-out')({
  component: SignedOutRouteComponent,
})

function SignedOutRouteComponent() {
  const { t } = useTranslation()

  if (deploymentProfile !== 'cloud') return <Navigate replace to="/login" />

  return (
    <main className="bg-background text-foreground flex min-h-screen items-center justify-center p-6">
      <section
        className="border-border bg-card w-full max-w-md rounded-xl border p-8"
        aria-labelledby="signed-out-title"
      >
        <div className="bg-muted text-muted-foreground mb-6 flex size-10 items-center justify-center rounded-lg">
          <LogOut className="size-5" aria-hidden="true" />
        </div>
        <h1 id="signed-out-title" className="text-xl font-semibold tracking-tight">
          {t('auth.signedOut.title')}
        </h1>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          {t('auth.signedOut.description')}
        </p>
        <Button className="mt-6 w-full" onClick={() => replaceWithCloudConsole()}>
          {t('auth.signedOut.returnToCloud')}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </section>
    </main>
  )
}
