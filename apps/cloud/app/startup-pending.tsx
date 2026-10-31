import { useTranslation } from 'react-i18next'

import { startupRetryUrl } from '../../startup-retry'

/** Pending child routes retain their surrounding workspace rather than rendering another page shell. */
export function StartupPending() {
  const { t } = useTranslation()
  return (
    <section className="mx-auto max-w-xl space-y-4 p-6" role="status" aria-live="polite">
      <h1 className="text-xl font-semibold">{t('startup.title')}</h1>
      <p className="text-muted-foreground text-sm">{t('startup.help')}</p>
      <a
        className="inline-flex min-h-11 items-center underline underline-offset-4"
        href={startupRetryUrl(new URL(window.location.href))}
      >
        {t('startup.retry')}
      </a>
    </section>
  )
}
