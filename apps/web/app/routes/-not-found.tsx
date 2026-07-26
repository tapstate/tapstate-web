import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

export function NotFoundRouteComponent() {
  const { t } = useTranslation()

  return (
    <main className="page-state min-h-screen">
      <div className="page-state__eyebrow">{t('notFound.eyebrow')}</div>
      <h1 className="page-state__title">{t('notFound.title')}</h1>
      <p className="page-state__description">{t('notFound.description')}</p>
      <Link
        className="rounded-lg bg-gray-900 px-3 py-1.5 text-[13px] font-medium text-white"
        to="/"
      >
        {t('notFound.back')}
      </Link>
    </main>
  )
}
