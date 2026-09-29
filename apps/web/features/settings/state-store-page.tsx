import { useQuery } from '@tanstack/react-query'
import { HardDrive } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { listSources, MANAGED_VIEW_STORE_SOURCE_ID } from '@/service/source-client'
import { useAuthStore } from '@/stores/auth-store'

/**
 * Settings, State stores: where views are kept. Today the only store is the server's managed
 * one, found among the sources; its connection details are deliberately not shown, since the
 * managed store is derived from the server's own connection string.
 */
export function StateStorePage() {
  const { t } = useTranslation()
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const sourcesQuery = useQuery({ queryKey: ['sources'], queryFn: () => listSources(apiFetch) })
  const managed = sourcesQuery.data?.find((source) => source.id === MANAGED_VIEW_STORE_SOURCE_ID)

  return (
    <section className="settings-page">
      <header className="settings-page__header">
        <h1 className="text-foreground text-[15px] font-semibold">{t('stateStorePage.title')}</h1>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled
          title={t('stateStorePage.addLimit')}
        >
          {t('stateStorePage.add')}
        </Button>
      </header>
      <div className="settings-page__body">
        <p className="text-muted-foreground text-[13px]">{t('stateStorePage.intro')}</p>
        {sourcesQuery.isLoading ? (
          <p className="text-muted-foreground text-[13px]" aria-busy="true">
            {t('stateStorePage.states.loading')}
          </p>
        ) : sourcesQuery.isError ? (
          <div className="settings-page__state" role="alert">
            <p>{t('stateStorePage.states.error')}</p>
            <Button type="button" variant="outline" onClick={() => void sourcesQuery.refetch()}>
              {t('state.error.retry')}
            </Button>
          </div>
        ) : managed === undefined ? (
          <p className="text-muted-foreground text-[13px]">{t('stateStorePage.states.empty')}</p>
        ) : (
          <ul className="settings-store-list" aria-label={t('stateStorePage.listLabel')}>
            <li className="settings-store">
              <div className="settings-store__title">
                <HardDrive className="text-muted-foreground h-4 w-4 shrink-0" aria-hidden="true" />
                <h2 className="text-foreground text-[13px] font-semibold">
                  {t('stateStorePage.managed.name')}
                </h2>
                <span className="settings-store__badge">{t('stateStorePage.default')}</span>
              </div>
              <dl className="settings-store__details">
                <div>
                  <dt>{t('stateStorePage.fields.type')}</dt>
                  <dd>{t('stateStorePage.managed.type')}</dd>
                </div>
                <div>
                  <dt>{t('stateStorePage.fields.checks')}</dt>
                  <dd>{t('overview.notReported')}</dd>
                </div>
                <div>
                  <dt>{t('stateStorePage.fields.usage')}</dt>
                  <dd>{t('overview.notReported')}</dd>
                </div>
                <div>
                  <dt>{t('stateStorePage.fields.access')}</dt>
                  <dd>{t('stateStorePage.managed.access')}</dd>
                </div>
              </dl>
              <div className="settings-store__actions">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled
                  title={t('stateStorePage.managed.deleteReason')}
                >
                  {t('stateStorePage.delete')}
                </Button>
                <span className="text-muted-foreground text-[12px]">
                  {t('stateStorePage.managed.deleteReason')}
                </span>
              </div>
            </li>
          </ul>
        )}
      </div>
    </section>
  )
}
