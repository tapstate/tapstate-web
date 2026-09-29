import { ShieldAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function CloudSessionRequired() {
  const { t } = useTranslation()

  return (
    <main
      className="bg-background text-foreground fixed inset-0 z-50 flex items-center justify-center p-6 font-sans"
      aria-labelledby="cloud-session-title"
    >
      <section className="border-border bg-card w-full max-w-md rounded-xl border p-8 shadow-sm">
        <div className="bg-muted text-muted-foreground mb-6 flex h-10 w-10 items-center justify-center rounded-lg">
          <ShieldAlert className="h-5 w-5" aria-hidden="true" />
        </div>
        <h1 id="cloud-session-title" className="text-xl font-semibold tracking-tight">
          {t('auth.cloudSession.title')}
        </h1>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          {t('auth.cloudSession.description')}
        </p>
      </section>
    </main>
  )
}
