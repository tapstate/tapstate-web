import { Tabs, TabsList, TabsTab } from '@tapstate-web/ui/tabs'
import { Building2, ShieldCheck, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { cloudApi, type LinkedIdentity } from '../../service/cloud-api'
import { useCloudAppState } from '../../state/cloud-app-state'
import { OrganizationsPage } from '../organizations/organizations-page'

export type SettingsTab = 'account' | 'organization'

export interface SettingsPageProps {
  initialTab?: SettingsTab
  onTabChange?: (tab: SettingsTab) => void
}

export function SettingsPage({ initialTab = 'account', onTabChange }: SettingsPageProps = {}) {
  const { activeOrganization, user } = useCloudAppState()
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab)
  const [identities, setIdentities] = useState<LinkedIdentity[]>([])
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isLinking, setIsLinking] = useState<'google' | 'github' | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab)
    }
  }, [initialTab])

  useEffect(() => {
    let cancelled = false
    cloudApi
      .identities()
      .then((items) => {
        if (!cancelled) setIdentities(items)
      })
      .catch(() => {
        if (!cancelled) setError('settings.identityLoadError')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleTabChange = (nextTab: SettingsTab) => {
    setActiveTab(nextTab)
    onTabChange?.(nextTab)
  }

  const linkIdentity = async (provider: 'google' | 'github') => {
    setError(null)
    setIsLinking(provider)
    try {
      await cloudApi.reauthenticateIdentity(password)
    } catch {
      setError('settings.reauthenticationError')
      setIsLinking(null)
      return
    }
    try {
      const authorizationUrl = await cloudApi.oauthStart(provider, 'link')
      window.location.assign(authorizationUrl)
    } catch {
      setError('settings.identityLinkStartError')
      setIsLinking(null)
    }
  }

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between border-b border-black/[0.05] px-6 py-4 dark:border-white/[0.05]">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">
            {t('sections.settings.title')}
          </h1>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            {t('sections.settings.description')}
          </p>
        </div>
      </header>

      <div className="shrink-0 border-b border-black/[0.05] px-6 pt-3 dark:border-white/[0.05]">
        <Tabs value={activeTab} onValueChange={(val) => handleTabChange(val as SettingsTab)}>
          <TabsList aria-label={t('sections.settings.title')}>
            <TabsTab value="account">{t('settings.tabAccount')}</TabsTab>
            <TabsTab value="organization">{t('settings.tabOrganization')}</TabsTab>
          </TabsList>
        </Tabs>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {activeTab === 'account' && (
          <div className="max-w-4xl space-y-6 p-6">
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-xs font-semibold tracking-wider text-neutral-400 uppercase">
                <UserRound className="h-3.5 w-3.5" />
                {t('settings.tabAccount')}
              </h2>
              <div className="space-y-3 rounded-xl border border-black/[0.06] p-4 dark:border-white/[0.06]">
                <div>
                  <div className="text-xs font-medium text-neutral-900 dark:text-white">Name</div>
                  <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    {user?.displayName?.trim() || '—'}
                  </div>
                </div>
                <div className="border-t border-black/[0.05] pt-3 dark:border-white/[0.05]">
                  <div className="text-xs font-medium text-neutral-900 dark:text-white">
                    Email Address
                  </div>
                  <div className="mt-1 font-mono text-xs text-neutral-500 dark:text-neutral-400">
                    {user?.email ?? '—'}
                  </div>
                </div>
                <div className="border-t border-black/[0.05] pt-3 dark:border-white/[0.05]">
                  <div className="text-xs font-medium text-neutral-900 dark:text-white">
                    Account ID
                  </div>
                  <div className="mt-1 font-mono text-[11px] break-all text-neutral-500 dark:text-neutral-400">
                    {user?.id ?? '—'}
                  </div>
                </div>
              </div>
            </section>

            <section aria-labelledby="linked-identities-title" className="space-y-3">
              <h2
                className="flex items-center gap-2 text-xs font-semibold tracking-wider text-neutral-400 uppercase"
                id="linked-identities-title"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                {t('settings.linkedIdentitiesTitle')}
              </h2>
              <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <p className="text-xs text-[var(--muted-foreground)]">
                  {t('settings.linkedIdentitiesDescription')}
                </p>
                <div className="space-y-2">
                  {(['google', 'github'] as const).map((provider) => {
                    const linked = identities.find((identity) => identity.provider === provider)
                    return (
                      <div
                        className="flex flex-col gap-2 rounded-md border border-[var(--border-subtle)] p-3 sm:flex-row sm:items-center sm:justify-between"
                        key={provider}
                      >
                        <div>
                          <div className="text-sm font-medium text-[var(--foreground)]">
                            {t(`settings.provider.${provider}`)}
                          </div>
                          <div className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                            {isLoading
                              ? t('settings.loadingIdentities')
                              : linked
                                ? t('settings.identityLinked', {
                                    email: linked.email ?? user?.email ?? '',
                                  })
                                : t('settings.identityNotLinked')}
                          </div>
                        </div>
                        <button
                          className="h-9 rounded-md border border-[var(--border)] px-3 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--app-background)] disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={isLoading || Boolean(linked) || isLinking !== null}
                          onClick={() => void linkIdentity(provider)}
                          type="button"
                        >
                          {isLinking === provider
                            ? t('settings.linkingIdentity')
                            : t('settings.linkIdentity')}
                        </button>
                      </div>
                    )
                  })}
                </div>
                <div className="space-y-1.5">
                  <label
                    className="block text-xs font-medium text-[var(--foreground)]"
                    htmlFor="identity-reauth-password"
                  >
                    {t('settings.reauthenticationPasswordLabel')}
                  </label>
                  <input
                    autoComplete="current-password"
                    className="h-9 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
                    id="identity-reauth-password"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={t('settings.reauthenticationPasswordPlaceholder')}
                    type="password"
                    value={password}
                  />
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {t('settings.reauthenticationHint')}
                  </p>
                </div>
                {error && (
                  <p className="text-sm text-[var(--foreground)]" role="alert">
                    {t(error)}
                  </p>
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'organization' && (
          <div className="space-y-6">
            <div className="max-w-4xl p-6 pb-0">
              <section className="space-y-3">
                <h2 className="flex items-center gap-2 text-xs font-semibold tracking-wider text-neutral-400 uppercase">
                  <Building2 className="h-3.5 w-3.5" />
                  {t('sections.organizations.title')}
                </h2>
                <div className="space-y-3 rounded-xl border border-black/[0.06] p-4 dark:border-white/[0.06]">
                  <div>
                    <div className="text-xs font-medium text-neutral-900 dark:text-white">Name</div>
                    <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      {activeOrganization?.name ?? '—'}
                    </div>
                  </div>
                  <div className="border-t border-black/[0.05] pt-3 dark:border-white/[0.05]">
                    <div className="text-xs font-medium text-neutral-900 dark:text-white">Slug</div>
                    <div className="mt-1 font-mono text-xs text-neutral-500 dark:text-neutral-400">
                      {activeOrganization?.slug ?? '—'}
                    </div>
                  </div>
                  <div className="flex items-start gap-2 border-t border-black/[0.05] pt-3 text-xs text-neutral-500 dark:border-white/[0.05] dark:text-neutral-400">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>Changes to these settings are not available yet.</span>
                  </div>
                </div>
              </section>
            </div>
            <OrganizationsPage embedded />
          </div>
        )}
      </div>
    </div>
  )
}
