import type { ComponentType, SVGProps } from 'react'

import { useQuery } from '@tanstack/react-query'
import { Link, useRouterState } from '@tanstack/react-router'
import {
  Activity,
  ArrowLeft,
  Building2,
  ChevronDown,
  Database,
  GitMerge,
  LayoutDashboard,
  Settings,
  Table2,
  Terminal,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'
import { loadCloudWorkspaceContext } from '@/service/cloud-workspace-client'
import { useAuthStore } from '@/stores/auth-store'
import { cloudConsoleUrl } from '@/utils/cloud-console'

import { AppHeader } from './app-header'

interface NavigationItem {
  labelKey: string
  to: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

const navigation: NavigationItem[] = [
  { labelKey: 'nav.overview', to: '/overview', icon: LayoutDashboard },
  { labelKey: 'alerts.systemHealth', to: '/health', icon: Activity },
  { labelKey: 'nav.sources', to: '/sources', icon: Database },
  { labelKey: 'nav.pipelines', to: '/pipelines', icon: GitMerge },
  { labelKey: 'nav.views', to: '/views', icon: Table2 },
]

/** Kept apart from the places above, at the foot of the sidebar. */
const footerNavigation: NavigationItem[] = [
  { labelKey: 'nav.settings', to: '/settings', icon: Settings },
]

export function AppSidebar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const { t } = useTranslation()
  const [settingsExpanded, setSettingsExpanded] = useState(pathname.startsWith('/settings'))
  useEffect(() => {
    if (pathname.startsWith('/settings')) setSettingsExpanded(true)
  }, [pathname])
  const profile = useAuthStore((state) => state.profile)
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const cloudContext = useQuery({
    queryKey: ['cloud-workspace-context'],
    queryFn: () => loadCloudWorkspaceContext(apiFetch),
    enabled: profile === 'cloud',
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
  const organizationUrl = cloudContext.data?.organizationId
    ? new URL(
        `/?organizationId=${encodeURIComponent(cloudContext.data.organizationId)}`,
        cloudConsoleUrl,
      ).toString()
    : null

  return (
    <aside className="app-sidebar bg-transparent">
      {profile === 'cloud' ? (
        <div className="app-sidebar__cloud-identity mt-2" aria-label={t('app.cloudIdentity.label')}>
          <a
            className={cn(
              'app-sidebar__cloud-organization',
              !organizationUrl && 'app-sidebar__cloud-organization--disabled',
            )}
            href={organizationUrl ?? undefined}
            aria-label={t('app.cloudIdentity.returnToOrganization', {
              organization: cloudContext.data?.organizationName ?? '',
            })}
            aria-disabled={!organizationUrl}
            onClick={(event) => {
              if (!organizationUrl) event.preventDefault()
            }}
          >
            <span className="app-sidebar__cloud-organization-icon" aria-hidden="true">
              <Building2 className="h-4 w-4" />
            </span>
            <span
              className="app-sidebar__cloud-organization-name"
              title={cloudContext.data?.organizationName}
            >
              {cloudContext.data?.organizationName ??
                (cloudContext.isLoading
                  ? t('app.cloudIdentity.organizationLoading')
                  : t('app.cloudIdentity.organizationUnavailable'))}
            </span>
            <ArrowLeft className="app-sidebar__cloud-return-icon" aria-hidden="true" />
          </a>
          <div className="app-sidebar__cloud-cluster" aria-live="polite">
            <span
              className={cn(
                'app-sidebar__cloud-cluster-status',
                cloudContext.data?.clusterState === 'READY' &&
                  'app-sidebar__cloud-cluster-status--ready',
                cloudContext.data?.clusterState === 'DEGRADED' &&
                  'app-sidebar__cloud-cluster-status--degraded',
              )}
              aria-hidden="true"
            />
            <span className="app-sidebar__cloud-cluster-copy">
              <span className="app-sidebar__cloud-cluster-name">
                {cloudContext.data?.clusterName ??
                  (cloudContext.isLoading
                    ? t('app.cloudIdentity.clusterLoading')
                    : t('app.cloudIdentity.clusterUnavailable'))}
              </span>
              <span className="app-sidebar__cloud-cluster-region">
                {cloudContext.data?.region
                  ? t('app.cloudIdentity.region', { region: cloudContext.data.region })
                  : t('app.cloudIdentity.regionUnavailable')}
              </span>
            </span>
          </div>
        </div>
      ) : (
        <div className="app-sidebar__brand mt-2">
          <div className="app-sidebar__mark" aria-hidden="true">
            <Terminal className="h-3 w-3 text-white" />
          </div>
          <span className="app-sidebar__title">{t('app.brand')}</span>
        </div>
      )}

      <nav className="app-sidebar__nav" aria-label={t('app.primaryNavigation')}>
        {navigation.map((item) => (
          <SidebarLink key={item.to} item={item} active={pathname.startsWith(item.to)} />
        ))}
      </nav>

      <nav
        className="app-sidebar__nav app-sidebar__nav--footer"
        aria-label={t('app.secondaryNavigation')}
      >
        {footerNavigation.map((item) => (
          <div key={item.to} className="app-sidebar__settings">
            <div className="app-sidebar__settings-parent">
              <SidebarLink item={item} active={pathname.startsWith(item.to)} />
              <button
                aria-label={t('alerts.settingsSections')}
                aria-expanded={settingsExpanded}
                onClick={() => setSettingsExpanded((v) => !v)}
              >
                <ChevronDown className={settingsExpanded ? 'h-3 w-3' : 'h-3 w-3 -rotate-90'} />
              </button>
            </div>
            {settingsExpanded && (
              <Link
                className={
                  pathname === '/settings/alerts'
                    ? 'app-sidebar__settings-child app-sidebar__settings-child--active'
                    : 'app-sidebar__settings-child'
                }
                to="/settings/alerts"
              >
                {t('alerts.configuration')}
              </Link>
            )}
          </div>
        ))}
      </nav>

      <AppHeader />
    </aside>
  )
}

function SidebarLink({ item, active }: { item: NavigationItem; active: boolean }) {
  const { t } = useTranslation()
  const Icon = item.icon
  return (
    <Link
      to={item.to}
      aria-current={active ? 'page' : undefined}
      className={cn('app-sidebar__link', active && 'app-sidebar__link--active')}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span>{t(item.labelKey)}</span>
    </Link>
  )
}
