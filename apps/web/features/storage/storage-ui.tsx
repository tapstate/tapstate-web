import type { ReactNode } from 'react'

import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { SUPPORTED_LOCALES } from '@/i18n'
import { StorageClientError, type StorageSnapshot } from '@/service/storage-client'

export const inputClass =
  'min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring'
export function StorageFrame({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation()
  return (
    <main className="storage-page bg-background text-foreground min-h-screen px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <span className="font-semibold">{t('app.brand')}</span>
          <div className="flex gap-1" aria-label={t('app.language')}>
            {SUPPORTED_LOCALES.map((locale) => (
              <Button
                className="min-h-11 sm:min-h-8"
                key={locale}
                variant="ghost"
                size="sm"
                aria-pressed={i18n.language === locale}
                onClick={() => void i18n.changeLanguage(locale)}
              >
                {t(`app.languageOptions.${locale}`)}
              </Button>
            ))}
          </div>
        </header>
        {children}
      </div>
    </main>
  )
}
export function StorageError({ error }: { error: unknown }) {
  const { t } = useTranslation()
  const connectionKind =
    error instanceof StorageClientError &&
    error.status === 400 &&
    error.code === 'control.storage-test-failed'
      ? (
          {
            'io.store-unauthorized': 'databaseCredentials',
            'store.database-access-failed': 'databasePermissions',
            'store.unreachable': 'databaseConnection',
          } as Record<string, string>
        )[error.causeCode ?? '']
      : undefined
  const kind =
    connectionKind ??
    (error instanceof StorageClientError
      ? error.status === 401
        ? 'authentication'
        : error.status === 409
          ? 'conflict'
          : error.status === 403
            ? 'permission'
            : error.status === 503
              ? 'dependency'
              : 'request'
      : 'network')
  return (
    <div
      role="alert"
      className="border-destructive/30 bg-destructive/5 rounded-md border p-3 text-sm"
    >
      <p>{t(`storage.errors.${kind}`)}</p>
      {error instanceof StorageClientError && error.code.includes('.') && (
        <code className="mt-1 block text-xs">{error.code}</code>
      )}
    </div>
  )
}
export function StorageHealthPanel({ snapshot }: { snapshot: StorageSnapshot }) {
  const { t } = useTranslation()
  return (
    <section className="space-y-4" aria-label={t('storage.healthTitle')}>
      <div className="border-border rounded-lg border p-4">
        <h2 className="font-medium">{t(`storage.phase.${snapshot.businessPhase}`)}</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {t(`storage.phaseHelp.${snapshot.businessPhase}`)}
        </p>
      </div>
      <dl className="grid gap-3 sm:grid-cols-3">
        {(['CONFIG', 'CACHE', 'MASTER'] as const).map((layer) => (
          <div key={layer} className="border-border rounded-lg border p-4">
            <dt className="text-sm font-medium">{t(`storage.layers.${layer}`)}</dt>
            <dd className="text-muted-foreground mt-2 text-sm">
              {t(`storage.health.${snapshot.health[layer]}`)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
