import { useQuery } from '@tanstack/react-query'
import { HardDrive } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { listSources } from '@/service/source-client'
import { stateStoreSource } from '@/service/state-store-source'
import { useAuthStore } from '@/stores/auth-store'
import { getDeploymentProfile } from '@/utils/deployment-profile'

/** Settings, State stores: one deployment-managed destination, never a data source. */
export function StateStorePage() {
  const { t } = useTranslation()
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const sourcesQuery = useQuery({ queryKey: ['sources'], queryFn: () => listSources(apiFetch) })
  const profile = getDeploymentProfile()
  const managed = stateStoreSource(sourcesQuery.data ?? [], profile)

  return (
    <section className="settings-page">
      <header className="settings-page__header">
        <h1 className="text-foreground text-[15px] font-semibold">
          {t('stateStorePage.settings')}
        </h1>
      </header>
      <div className="settings-page__layout">
        <nav className="settings-sections" aria-label={t('stateStorePage.sectionsLabel')}>
          <span
            className="settings-sections__item settings-sections__item--active"
            aria-current="page"
          >
            {t('stateStorePage.sections.stateStore')}
          </span>
          {/* Listed so the page reads as the approved design does; not in this release. */}
          <span
            className="settings-sections__item settings-sections__item--disabled"
            aria-disabled="true"
          >
            {t('stateStorePage.sections.members')}
          </span>
          <span
            className="settings-sections__item settings-sections__item--disabled"
            aria-disabled="true"
          >
            {t('stateStorePage.sections.apiKeys')}
          </span>
        </nav>
        <div className="settings-page__body">
          <div className="settings-page__section-header">
            <h2 className="text-foreground text-[15px] font-semibold">
              {t('stateStorePage.title')}
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-[12px]">
                {t('stateStorePage.addLimit')}
              </span>
              <Button type="button" variant="outline" size="sm" disabled>
                {t('stateStorePage.add')}
              </Button>
            </div>
          </div>
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
          ) : managed === null ? (
            <p className="text-muted-foreground text-[13px]">{t('stateStorePage.states.empty')}</p>
          ) : (
            <ul className="settings-store-list" aria-label={t('stateStorePage.listLabel')}>
              <li className="settings-store">
                <div className="settings-store__title">
                  <HardDrive
                    className="text-muted-foreground h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  <h2 className="text-foreground text-[13px] font-semibold">
                    {t(
                      profile === 'cloud'
                        ? 'stateStorePage.cloud.name'
                        : 'stateStorePage.managed.name',
                    )}
                  </h2>
                  <span className="settings-store__badge">{t('stateStorePage.default')}</span>
                </div>
                <dl className="settings-store__details">
                  <div>
                    <dt>{t('stateStorePage.fields.type')}</dt>
                    <dd>
                      {t(
                        profile === 'cloud'
                          ? 'stateStorePage.cloud.type'
                          : 'stateStorePage.managed.type',
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>{t('stateStorePage.fields.location')}</dt>
                    <dd>
                      {typeof managed.config.database === 'string'
                        ? managed.config.database
                        : t('overview.notReported')}
                    </dd>
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
                    <dd>
                      {t(
                        profile === 'cloud'
                          ? 'stateStorePage.cloud.access'
                          : 'stateStorePage.managed.access',
                      )}
                    </dd>
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
      </div>
    </section>
  )
}
