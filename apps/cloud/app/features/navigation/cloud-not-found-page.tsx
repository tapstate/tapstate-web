import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

export function CloudNotFoundPage() {
  const { t } = useTranslation()
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center gap-6">
      <div className="flex items-center justify-center">
        <h1 className="mr-5 h-12.5 shrink-0 border-r border-black/30 pr-5 text-[24px] leading-12.5 font-medium">
          404
        </h1>
        <p className="text-sm">{t('notFound.message')}</p>
      </div>
      <Link
        className="text-sm font-medium text-indigo-600 underline underline-offset-4"
        to="/"
        search={(previous) => ({
          organizationId:
            typeof previous.organizationId === 'string' ? previous.organizationId : undefined,
        })}
      >
        {t('notFound.back')}
      </Link>
    </main>
  )
}
