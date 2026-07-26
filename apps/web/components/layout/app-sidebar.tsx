import type { ComponentType, SVGProps } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { Database, GitMerge, MessageSquareText, Terminal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface NavigationItem {
  labelKey: string
  to: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

const navigation: NavigationItem[] = [
  { labelKey: 'nav.sources', to: '/sources', icon: Database },
  { labelKey: 'nav.pipelines', to: '/pipelines', icon: GitMerge },
  { labelKey: 'nav.explorations', to: '/explorations', icon: MessageSquareText },
]

export function AppSidebar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const { t } = useTranslation()

  return (
    <aside className="app-sidebar">
      <div className="app-sidebar__brand">
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
              className={cn(
                'app-sidebar__link',
                pathname.startsWith(item.to) && 'app-sidebar__link--active',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{t(item.labelKey)}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
