import type { ComponentType, SVGProps } from 'react'

import { Link, useRouterState } from '@tanstack/react-router'
import {
  Database,
  GitMerge,
  LayoutDashboard,
  MessageSquareText,
  Settings,
  Table2,
  Terminal,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'
import { getDeploymentProfile } from '@/utils/deployment-profile'

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
  ...(getDeploymentProfile() === 'cloud'
    ? [{ labelKey: 'nav.views', to: '/views', icon: Table2 }]
    : []),
  { labelKey: 'nav.explorations', to: '/explorations', icon: MessageSquareText },
]

/** Kept apart from the places above, at the foot of the sidebar. */
const footerNavigation: NavigationItem[] = [
  { labelKey: 'nav.settings', to: '/settings', icon: Settings },
]

export function AppSidebar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const { t } = useTranslation()

  return (
    <aside className="app-sidebar bg-transparent">
      <div className="app-sidebar__brand mt-2">
        <div className="app-sidebar__mark" aria-hidden="true">
          <Terminal className="h-3 w-3 text-white" />
        </div>
        <span className="app-sidebar__title">{t('app.brand')}</span>
      </div>

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
          <SidebarLink key={item.to} item={item} active={pathname.startsWith(item.to)} />
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
