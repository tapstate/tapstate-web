import { useNavigate } from '@tanstack/react-router'
import { XCircle } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { useCloudAppState } from '../../state/cloud-app-state'
import { clearCheckoutAttempt } from './checkout-attempt'

export function CheckoutCancelPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { activeOrganization } = useCloudAppState()

  useEffect(() => {
    clearCheckoutAttempt()
  }, [])

  return (
    <div className="flex h-full flex-1 flex-col overflow-y-auto">
      <header className="flex shrink-0 items-center justify-between border-b border-black/[0.05] px-6 py-4 dark:border-white/[0.05]">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">
            {t('billing.cancelled.title')}
          </h1>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            {t('billing.cancelled.subtitle')}
          </p>
        </div>
      </header>

      <div className="max-w-xl space-y-5 p-6">
        <div className="space-y-3 rounded-xl border border-black/[0.06] p-5 dark:border-white/[0.06]">
          <div className="flex items-start gap-2.5 text-sm text-neutral-700 dark:text-neutral-300">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
            <span>{t('billing.cancelled.body')}</span>
          </div>
          <button
            className="h-9 rounded-lg bg-neutral-900 px-4 text-[13px] font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
            onClick={() =>
              void navigate({
                to: '/billing',
                search: { organizationId: activeOrganization?.id },
              })
            }
            type="button"
          >
            {t('billing.cancelled.back')}
          </button>
        </div>
      </div>
    </div>
  )
}
