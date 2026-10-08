import { Link } from '@tanstack/react-router'
import { CloudOff, ShieldAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function AccessDeniedPage() {
  const { t } = useTranslation()

  return (
    <main className="access-page">
      <div className="access-card" role="alert">
        <div className="access-icon" aria-hidden="true">
          <ShieldAlert />
        </div>
        <p className="eyebrow">{t('access.eyebrow')}</p>
        <h1>{t('access.title')}</h1>
        <p className="access-copy">{t('access.description')}</p>
        <div className="access-status">
          <CloudOff aria-hidden="true" />
          <span>{t('access.status')}</span>
        </div>
        <Link className="cloud-button-primary access-action" to="/auth">
          {t('access.signInAction')}
        </Link>
      </div>
    </main>
  )
}
