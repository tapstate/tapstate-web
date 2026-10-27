import { CheckCircle2, CircleHelp, CircleX, Loader2, TriangleAlert } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { SUPPORTED_LOCALES } from '@/i18n'
import {
  StorageClientError,
  type StorageLayer,
  type StorageSnapshot,
} from '@/service/storage-client'

export const inputClass =
  'min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring'
export function StorageIndicator({
  tone,
  children,
}: {
  tone: 'success' | 'error' | 'pending' | 'working' | 'warning'
  children: ReactNode
}) {
  const Icon = {
    success: CheckCircle2,
    error: CircleX,
    pending: CircleHelp,
    working: Loader2,
    warning: TriangleAlert,
  }[tone]
  const color = {
    success: 'text-success',
    error: 'text-destructive',
    pending: 'text-muted-foreground',
    working: 'text-primary',
    warning: 'text-warning',
  }[tone]
  return (
    <span className={`inline-flex items-center gap-2 font-medium ${color}`}>
      <Icon
        className={`size-5 shrink-0 ${tone === 'working' ? 'animate-spin motion-reduce:animate-none' : ''}`}
        aria-hidden="true"
      />
      <span>{children}</span>
    </span>
  )
}
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
export function StorageHealthPanel({
  snapshot,
  checkingApplicationData = false,
  unverifiedApplicationData = false,
  autoRefreshing = false,
  setupChecks,
  showPhaseSummary = true,
}: {
  snapshot: StorageSnapshot
  checkingApplicationData?: boolean
  unverifiedApplicationData?: boolean
  autoRefreshing?: boolean
  setupChecks?: Partial<Record<StorageLayer, string>>
  showPhaseSummary?: boolean
}) {
  const { t, i18n } = useTranslation()
  const verification = snapshot.applicationDataVerification
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    setNow(Date.now())
    if (!verification?.validUntil) return
    const remaining = Date.parse(verification.validUntil) - Date.now()
    if (remaining <= 0) return
    const timer = window.setTimeout(() => setNow(Date.now()), remaining + 1)
    return () => window.clearTimeout(timer)
  }, [verification])
  const verificationStatus = checkingApplicationData
    ? 'CHECKING'
    : unverifiedApplicationData
      ? 'UNKNOWN'
      : verification?.validUntil && Date.parse(verification.validUntil) <= now
        ? 'EXPIRED'
        : verification?.status
  return (
    <section className="space-y-4" aria-label={t('storage.healthTitle')}>
      {showPhaseSummary && (
        <div className="border-border rounded-lg border p-4">
          <h2 className="font-medium" role={autoRefreshing ? 'status' : undefined}>
            {autoRefreshing ? (
              <StorageIndicator tone="working">
                {t(`storage.phase.${snapshot.businessPhase}`)}
              </StorageIndicator>
            ) : (
              t(`storage.phase.${snapshot.businessPhase}`)
            )}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {t(`storage.phaseHelp.${snapshot.businessPhase}`)}
          </p>
          {autoRefreshing && (
            <p className="text-muted-foreground mt-2 text-sm">{t('storage.autoRefresh')}</p>
          )}
        </div>
      )}
      <dl className="grid gap-3 sm:grid-cols-3">
        {(['CONFIG', 'CACHE', 'MASTER'] as const).map((layer) => {
          const setupCheckedAt =
            (snapshot.health[layer] === 'UNKNOWN' ||
              (layer === 'CACHE' && snapshot.health[layer] === 'AUTH_READY')) &&
            (layer !== 'MASTER' || !verificationStatus || verificationStatus === 'UNKNOWN')
              ? setupChecks?.[layer]
              : undefined
          return (
            <div key={layer} className="border-border rounded-lg border p-4">
              <dt className="text-sm font-medium">{t(`storage.layers.${layer}`)}</dt>
              <dd className="text-muted-foreground mt-2 text-sm">
                <StorageIndicator
                  tone={
                    setupCheckedAt
                      ? 'success'
                      : layer === 'MASTER' && verificationStatus
                        ? verificationStatus === 'PASSED'
                          ? 'success'
                          : verificationStatus === 'FAILED'
                            ? 'error'
                            : verificationStatus === 'EXPIRED'
                              ? 'warning'
                              : verificationStatus === 'CHECKING'
                                ? 'working'
                                : 'pending'
                        : snapshot.health[layer] === 'AVAILABLE'
                          ? 'success'
                          : snapshot.health[layer] === 'UNAVAILABLE'
                            ? 'error'
                            : snapshot.health[layer] === 'AUTH_READY'
                              ? 'warning'
                              : 'pending'
                  }
                >
                  {setupCheckedAt
                    ? t('storage.testPassed')
                    : layer === 'MASTER' && verificationStatus
                      ? t(`storage.verification.${verificationStatus}`)
                      : t(`storage.health.${snapshot.health[layer]}`)}
                </StorageIndicator>
                {setupCheckedAt && (
                  <div className="mt-2 space-y-1 text-xs">
                    <p>
                      {t('storage.verification.checkedAt')}{' '}
                      <time dateTime={setupCheckedAt}>
                        {new Intl.DateTimeFormat(i18n.resolvedLanguage, {
                          dateStyle: 'medium',
                          timeStyle: 'medium',
                        }).format(new Date(setupCheckedAt))}
                      </time>
                    </p>
                    <p>{t('storage.setupCheckRetained')}</p>
                  </div>
                )}
                {!setupCheckedAt && layer === 'MASTER' && verification && (
                  <div className="mt-2 space-y-1 text-xs">
                    {verification.checkedAt ? (
                      <p>
                        {t('storage.verification.checkedAt')}{' '}
                        <time dateTime={verification.checkedAt}>
                          {new Intl.DateTimeFormat(i18n.resolvedLanguage, {
                            dateStyle: 'medium',
                            timeStyle: 'medium',
                          }).format(new Date(verification.checkedAt))}
                        </time>
                      </p>
                    ) : null}
                    <p>{t('storage.verification.help')}</p>
                  </div>
                )}
              </dd>
            </div>
          )
        })}
      </dl>
    </section>
  )
}
