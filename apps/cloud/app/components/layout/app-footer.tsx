import { useTranslation } from 'react-i18next'

const LEGAL_DOCS = {
  eula: 'https://docs.tapstate.com/legal/eula',
  privacy: 'https://docs.tapstate.com/privacy',
  subscription: 'https://docs.tapstate.com/subscription-policy',
  dpa: 'https://docs.tapstate.com/data-processing-addendum',
} as const

export function AppFooter() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  return (
    <footer className="flex items-center justify-between gap-4 border-t border-black/[0.06] px-6 py-3 text-[11px] text-neutral-500 dark:border-white/[0.08] dark:text-neutral-400">
      <div className="flex items-center gap-4">
        <span>© {year} {t('footer.company')}</span>
        <span className="hidden sm:inline">{t('footer.address')}</span>
      </div>

      <div className="flex items-center gap-3">
        <a
          className="hover:text-neutral-900 dark:hover:text-white"
          href={LEGAL_DOCS.eula}
          rel="noopener noreferrer"
          target="_blank"
        >
          {t('footer.legalLinks.eula')}
        </a>
        <span aria-hidden="true">·</span>
        <a
          className="hover:text-neutral-900 dark:hover:text-white"
          href={LEGAL_DOCS.privacy}
          rel="noopener noreferrer"
          target="_blank"
        >
          {t('footer.legalLinks.privacy')}
        </a>
        <span aria-hidden="true">·</span>
        <a
          className="hover:text-neutral-900 dark:hover:text-white"
          href={LEGAL_DOCS.subscription}
          rel="noopener noreferrer"
          target="_blank"
        >
          {t('footer.legalLinks.subscription')}
        </a>
        <span aria-hidden="true">·</span>
        <a
          className="hover:text-neutral-900 dark:hover:text-white"
          href={LEGAL_DOCS.dpa}
          rel="noopener noreferrer"
          target="_blank"
        >
          {t('footer.legalLinks.dpa')}
        </a>
        <span aria-hidden="true">·</span>
        <a
          className="hover:text-neutral-900 dark:hover:text-white"
          href={`mailto:${t('footer.supportEmail')}`}
        >
          {t('footer.support')}
        </a>
      </div>
    </footer>
  )
}
