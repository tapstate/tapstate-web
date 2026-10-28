import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { HardDrive } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { ConfigurationTransfer } from '@/features/storage/configuration-transfer'
import { useStorage } from '@/features/storage/storage-context'
import { StorageRecovery } from '@/features/storage/storage-recovery'
import { StorageError, StorageHealthPanel } from '@/features/storage/storage-ui'
import { useStorageAction } from '@/features/storage/use-storage-action'
import { getSource, listSources, testConnection } from '@/service/source-client'
import { stateStoreDatabase, stateStoreSource } from '@/service/state-store-source'
import { StorageClientError } from '@/service/storage-client'
import { useAuthStore } from '@/stores/auth-store'
import { getDeploymentProfile } from '@/utils/deployment-profile'

/** Settings show the system-owned default Source used for application data. */
export function StateStorePage() {
  const { t } = useTranslation()
  const { snapshot, refresh } = useStorage()
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const sourcesQuery = useQuery({ queryKey: ['sources'], queryFn: () => listSources(apiFetch) })
  const profile = getDeploymentProfile()
  const managed = stateStoreSource(sourcesQuery.data ?? [], profile)
  const database = managed ? stateStoreDatabase(managed) : null
  const verification = useStorageAction()
  const canVerify = Boolean(managed && snapshot?.allowedActions.includes('connection.test'))
  function refreshStatus() {
    void verification.run(
      async (isCurrent) => {
        try {
          if (canVerify && managed) {
            const { source } = await getSource(managed.id, apiFetch)
            if (!isCurrent()) return
            if (!stateStoreSource([source], profile)) throw new StorageClientError('stale', 409)
            await testConnection(
              { id: source.id, connectorId: source.connector, settings: source.config },
              apiFetch,
            )
          }
        } finally {
          if (isCurrent()) await refresh()
        }
      },
      () => {},
    )
  }

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
          <Link to="/settings/alerts" className="settings-sections__item">
            {t('alerts.configuration')}
          </Link>
        </nav>
        <div className="settings-page__body">
          {snapshot && (
            <StorageHealthPanel
              snapshot={snapshot}
              checkingApplicationData={verification.busy && canVerify}
              unverifiedApplicationData={Boolean(verification.error)}
            />
          )}
          <div>
            <Button variant="outline" disabled={verification.busy} onClick={refreshStatus}>
              {t(
                verification.busy && canVerify
                  ? 'storage.verification.CHECKING'
                  : 'storage.refresh',
              )}
            </Button>
          </div>
          {Boolean(verification.error) && <StorageError error={verification.error} />}
          <div className="settings-page__section-header">
            <h2 className="text-foreground text-[15px] font-semibold">
              {t('stateStorePage.title')}
            </h2>
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
                  {database !== null && (
                    <div>
                      <dt>{t('stateStorePage.fields.location')}</dt>
                      <dd>{database}</dd>
                    </div>
                  )}
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
              </li>
            </ul>
          )}
          {snapshot?.allowedActions.includes('configuration.import.status') && (
            <ConfigurationTransfer defaultSourceId={managed?.id} />
          )}
          {snapshot?.allowedActions.includes('storage.recovery.plan') && <StorageRecovery />}
        </div>
      </div>
    </section>
  )
}
