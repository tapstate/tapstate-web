import { useQuery } from '@tanstack/react-query'
import { ExternalLink, HardDrive } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { listSources } from '@/service/source-client'
import { stateStoreSource } from '@/service/state-store-source'
import { useAuthStore } from '@/stores/auth-store'
import { getDeploymentProfile } from '@/utils/deployment-profile'

/** Settings, State stores: one deployment-managed destination, never a data source. */
export function StateStorePage() {
  const { t } = useTranslation()
  const [activeSection, setActiveSection] = useState<'stateStore' | 'about'>('stateStore')
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const sourcesQuery = useQuery({ queryKey: ['sources'], queryFn: () => listSources(apiFetch) })
  const versionQuery = useQuery({
    queryKey: ['serverVersion'],
    queryFn: async () => {
      const response = await apiFetch('/version')
      if (!response.ok) throw new Error('Version could not be loaded.')
      const payload: unknown = await response.json()
      if (typeof payload !== 'object' || payload === null || !('version' in payload)) return null
      return typeof payload.version === 'string' && payload.version.trim().length > 0
        ? payload.version
        : null
    },
    refetchOnWindowFocus: false,
    refetchOnMount: 'always',
    retry: false,
    staleTime: Infinity,
  })
  const profile = getDeploymentProfile()
  const managed = stateStoreSource(sourcesQuery.data ?? [], profile)
  const database =
    typeof managed?.config.database === 'string' && managed.config.database.trim().length > 0
      ? managed.config.database
      : null

  return (
    <section className="settings-page">
      <header className="settings-page__header">
        <h1 className="text-foreground text-[15px] font-semibold">
          {t('stateStorePage.settings')}
        </h1>
      </header>
      <div className="settings-page__layout">
        <nav className="settings-sections" aria-label={t('stateStorePage.sectionsLabel')}>
          <button
            className={`settings-sections__item${activeSection === 'stateStore' ? ' settings-sections__item--active' : ''}`}
            aria-current={activeSection === 'stateStore' ? 'page' : undefined}
            onClick={() => setActiveSection('stateStore')}
            type="button"
          >
            {t('stateStorePage.sections.stateStore')}
          </button>
          <button
            className={`settings-sections__item${activeSection === 'about' ? ' settings-sections__item--active' : ''}`}
            aria-current={activeSection === 'about' ? 'page' : undefined}
            onClick={() => setActiveSection('about')}
            type="button"
          >
            {t('stateStorePage.about.title')}
          </button>
        </nav>
        <div className="settings-page__body">
          {activeSection === 'stateStore' ? (
            <>
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
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void sourcesQuery.refetch()}
                  >
                    {t('state.error.retry')}
                  </Button>
                </div>
              ) : managed === null ? (
                <p className="text-muted-foreground text-[13px]">
                  {t('stateStorePage.states.empty')}
                </p>
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
            </>
          ) : (
            <section className="settings-about" aria-labelledby="settings-about-heading">
              <div className="settings-page__section-header">
                <h2
                  id="settings-about-heading"
                  className="text-foreground text-[15px] font-semibold"
                >
                  {t('stateStorePage.about.title')}
                </h2>
              </div>
              <div className="settings-about__content">
                <div className="settings-about__identity" aria-label={t('app.brand')}>
                  <img alt="" className="h-10 w-10 dark:hidden" src="/tapstate-mark.svg" />
                  <img
                    alt=""
                    className="hidden h-10 w-10 dark:block"
                    src="/tapstate-mark-light.svg"
                  />
                  <span className="settings-about__brand">{t('app.brand')}</span>
                </div>
                <dl className="settings-about__version">
                  <dt>{t('stateStorePage.about.version')}</dt>
                  <dd aria-busy={versionQuery.isPending}>
                    {versionQuery.isPending
                      ? t('stateStorePage.about.loading')
                      : (versionQuery.data ?? t('stateStorePage.about.unavailable'))}
                  </dd>
                </dl>
                <div className="settings-about__legal">
                  <p className="settings-about__copyright">{t('stateStorePage.about.copyright')}</p>
                  <div className="settings-about__legal-links">
                    <a
                      href="https://tapstate.com/legal/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t('stateStorePage.about.privacyPolicy')}
                    </a>
                    <span aria-hidden="true" className="settings-about__divider">
                      ·
                    </span>
                    <a
                      href="https://tapstate.com/legal/eula"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t('stateStorePage.about.termsOfService')}
                    </a>
                  </div>
                </div>
                <footer className="settings-about__links">
                  <a
                    href="https://github.com/tapstate/tapstate/blob/main/LICENSE"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t('stateStorePage.about.license')}
                    <ExternalLink className="settings-about__external-icon" aria-hidden="true" />
                  </a>
                  <a
                    href="https://github.com/tapstate/tapstate/releases"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t('stateStorePage.about.releaseNotes')}
                    <ExternalLink className="settings-about__external-icon" aria-hidden="true" />
                  </a>
                </footer>
              </div>
            </section>
          )}
        </div>
      </div>
    </section>
  )
}
