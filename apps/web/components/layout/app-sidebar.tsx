import type { ComponentType, SVGProps } from 'react'

import { Link, useRouterState } from '@tanstack/react-router'
import { Database, GitMerge, MessageSquareText, Server, Terminal } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import { AppHeader } from './app-header'

interface NavigationItem {
  labelKey: string
  to: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

const navigation: NavigationItem[] = [
  { labelKey: 'nav.sources', to: '/sources', icon: Database },
  { labelKey: 'nav.pipelines', to: '/pipelines', icon: GitMerge },
  { labelKey: 'nav.destinations', to: '/destinations', icon: Server },
  { labelKey: 'nav.explorations', to: '/explorations', icon: MessageSquareText },
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
        {navigation.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={pathname.startsWith(item.to) ? 'page' : undefined}
              className={cn(
                'app-sidebar__link',
                pathname.startsWith(item.to) && 'app-sidebar__link--active',
              )}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>{t(item.labelKey)}</span>
            </Link>
          )
        })}
      </nav>

      <AppHeader />
    </aside>
  )
}
