import type { ComponentType, SVGProps } from 'react'

import { useQuery } from '@tanstack/react-query'
import { Link, useRouterState } from '@tanstack/react-router'
import { ArrowUpRight, Building2, Database, GitMerge, LayoutDashboard, Table2 } from 'lucide-react'
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
  { labelKey: 'nav.sources', to: '/sources', icon: Database },
  { labelKey: 'nav.pipelines', to: '/pipelines', icon: GitMerge },
  { labelKey: 'nav.views', to: '/views', icon: Table2 },
]

export function AppSidebar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const { t } = useTranslation()
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
    <aside
      className={cn('app-sidebar bg-transparent', profile === 'cloud' && 'app-sidebar--cloud')}
    >
      <div className="app-sidebar__brand mt-2">
        <img
          alt={t('app.brand')}
          className="app-sidebar__logo dark:hidden"
          src="/tapstate-lockup-light.svg"
        />
        <img
          alt={t('app.brand')}
          className="app-sidebar__logo hidden dark:block"
          src="/tapstate-lockup-dark.svg"
        />
      </div>
      {profile === 'cloud' && (
        <div className="app-sidebar__cloud-identity" aria-label={t('app.cloudIdentity.label')}>
          <a
            className="app-sidebar__cloud-organization"
            href={organizationUrl ?? undefined}
            target={organizationUrl ? '_blank' : undefined}
            rel={organizationUrl ? 'noopener noreferrer' : undefined}
            aria-label={t('app.cloudIdentity.returnToOrganization', {
              organization: cloudContext.data?.organizationName ?? '',
            })}
            title={t('app.cloudIdentity.returnToOrganization', {
              organization: cloudContext.data?.organizationName ?? '',
            })}
            aria-disabled={!organizationUrl}
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
            <ArrowUpRight className="app-sidebar__cloud-organization-arrow" aria-hidden="true" />
          </a>
          <div className="app-sidebar__cloud-details">
            <div className="app-sidebar__cloud-cluster" aria-live="polite">
              <span
                className={cn(
                  'app-sidebar__cloud-cluster-status',
                  (cloudContext.data?.clusterState === 'READY' ||
                    (cloudContext.isSuccess && cloudContext.data?.clusterState === null)) &&
                    'app-sidebar__cloud-cluster-status--ready',
                  cloudContext.data?.clusterState === 'DEGRADED' &&
                    'app-sidebar__cloud-cluster-status--degraded',
                )}
                aria-hidden="true"
              />
              <span className="sr-only">
                {cloudContext.data?.clusterState === 'READY'
                  ? t('app.cloudIdentity.clusterReady')
                  : cloudContext.isSuccess && cloudContext.data.clusterState === null
                    ? t('app.cloudIdentity.clusterConnected')
                    : t('app.cloudIdentity.clusterUnavailable')}
              </span>
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
        </div>
      )}

      <nav className="app-sidebar__nav" aria-label={t('app.primaryNavigation')}>
        {navigation.map((item) => (
          <SidebarLink key={item.to} item={item} active={pathname.startsWith(item.to)} />
        ))}
      </nav>

      <AppHeader cloudUserEmail={profile === 'cloud' ? cloudContext.data?.userEmail : null} />
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
