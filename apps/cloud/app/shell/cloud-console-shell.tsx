import type { ReactNode } from 'react'

import { Link } from '@tanstack/react-router'
import { Building2, CreditCard, Layers3, LayoutDashboard, Settings2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cloudSections } from '../features/cloud-data'

const icons = {
  overview: LayoutDashboard,
  clusters: Layers3,
  organizations: Building2,
  billing: CreditCard,
  settings: Settings2,
} as const

export function CloudConsoleShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation()

  return (
    <div className="cloud-shell">
      <aside className="app-sidebar">
        <Link className="brand" to="/" aria-label={t('app.brand')}>
          <span className="brand-mark" aria-hidden="true">
            T
          </span>
          <span className="brand-name">
            Tapstate <span>Cloud</span>
          </span>
        </Link>
        <div className="organization-context">
          <span className="org-avatar" aria-hidden="true">
            O
          </span>
          <span className="org-context-copy">
            <span className="context-caption">{t('app.organization')}</span>
            <span className="context-value">{t('app.organizationPlaceholder')}</span>
          </span>
          <span className="context-chevron" aria-hidden="true">
            ⌄
          </span>
        </div>
        <nav className="primary-nav" aria-label={t('app.primaryNavigation')}>
          <p className="nav-caption">{t('app.workspace')}</p>
          {cloudSections.map(({ id, path }) => {
            const Icon = icons[id]
            return (
              <Link
                key={id}
                to={path}
                activeOptions={{ exact: id === 'overview' }}
                activeProps={{ className: 'nav-link nav-link-active' }}
                inactiveProps={{ className: 'nav-link' }}
              >
                <Icon aria-hidden="true" />
                <span>{t(`sections.${id}.title`)}</span>
              </Link>
            )
          })}
        </nav>
        <div className="sidebar-footer">
          <span className="preview-indicator" aria-hidden="true" />
          <span>{t('app.unauthenticated')}</span>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <span>{t('app.console')}</span>
          <span className="account-chip">{t('app.signedOut')}</span>
        </header>
        {children}
      </div>
    </div>
  )
}
