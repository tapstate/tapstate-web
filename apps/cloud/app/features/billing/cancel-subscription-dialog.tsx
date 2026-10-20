import { AlertCircle, RefreshCw } from 'lucide-react'
import { useEffect, useRef, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'

import { formatDate } from './billing-format'

interface CancelSubscriptionDialogProps {
  errorMessage: string | null
  open: boolean
  periodEnd?: string | null
  planName: string
  price: string | null
  returnFocusRef: RefObject<HTMLElement | null>
  submitting: boolean
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
}

export function CancelSubscriptionDialog({
  errorMessage,
  open,
  periodEnd,
  planName,
  price,
  returnFocusRef,
  submitting,
  onConfirm,
  onOpenChange,
}: CancelSubscriptionDialogProps) {
  const { t, i18n } = useTranslation()
  const keepRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    // Focus the safe action first: this dialog only stops auto-renew, and the
    // destructive choice should never be one Enter keypress away.
    keepRef.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onOpenChange, open])

  const close = () => {
    if (submitting) return
    onOpenChange(false)
    returnFocusRef.current?.focus()
  }

  return (
    <div
      aria-hidden={!open}
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-150 ${
        open ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
      inert={!open}
    >
      <button
        aria-label={t('billing.cancelKeep')}
        className="absolute inset-0 cursor-default bg-black/40"
        onClick={close}
        tabIndex={-1}
        type="button"
      />
      <div
        aria-labelledby="cancel-subscription-title"
        aria-modal="true"
        className="relative w-full max-w-md space-y-4 rounded-xl border border-black/[0.08] bg-white p-5 shadow-xl dark:border-white/[0.1] dark:bg-[#202124]"
        role="dialog"
      >
        <div className="space-y-1.5">
          <h2
            className="text-base font-semibold text-neutral-900 dark:text-white"
            id="cancel-subscription-title"
          >
            {t('billing.cancelTitle')}
          </h2>
          <p className="text-[12px] text-neutral-500 dark:text-neutral-400">
            {t('billing.cancelPlanLine', { plan: planName })}
            {price ? ` · ${price}` : ''}
          </p>
        </div>

        <div className="flex items-start gap-2.5 rounded-lg border border-red-200/80 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-950/30">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          <div className="space-y-1.5 text-[12px] leading-relaxed text-red-700 dark:text-red-300">
            <p>{t('billing.cancelBody', { date: formatDate(periodEnd, i18n.language) })}</p>
            <p>{t('billing.cancelWarning')}</p>
          </div>
        </div>

        {errorMessage && (
          <p className="text-xs text-red-600 dark:text-red-400" role="alert">
            {errorMessage}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            className="h-9 rounded-lg border border-black/[0.1] bg-white px-4 text-[13px] font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:border-white/[0.12] dark:bg-[#1a1b1e] dark:text-neutral-300 dark:hover:bg-white/[0.05]"
            disabled={submitting}
            onClick={close}
            ref={keepRef}
            type="button"
          >
            {t('billing.cancelKeep')}
          </button>
          <button
            className="flex h-9 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-[13px] font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            disabled={submitting}
            onClick={onConfirm}
            type="button"
          >
            {submitting ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>{t('billing.cancelling')}</span>
              </>
            ) : (
              <span>{t('billing.cancelConfirm')}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
