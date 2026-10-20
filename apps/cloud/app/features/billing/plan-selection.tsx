import { Check, CreditCard, Lock, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { Spec } from '../../service/cloud-api'

import { formatPrice } from './billing-format'

interface PlanSelectionProps {
  canManage: boolean
  consent: boolean
  errorMessage: string | null
  hasError: boolean
  isLoading: boolean
  pendingNotice: boolean
  selectedKey: string | null
  specs: Spec[]
  submitting: boolean
  onConsentChange: (value: boolean) => void
  onRetry: () => void
  onSelect: (key: string) => void
  onSubmit: () => void
}

export function PlanSelection({
  canManage,
  consent,
  errorMessage,
  hasError,
  isLoading,
  pendingNotice,
  selectedKey,
  specs,
  submitting,
  onConsentChange,
  onRetry,
  onSelect,
  onSubmit,
}: PlanSelectionProps) {
  const { t } = useTranslation()
  const selectedSpec = specs.find((spec) => spec.key === selectedKey) ?? null

  return (
    <div className="space-y-6">
      {pendingNotice && (
        <div
          className="rounded-xl border border-amber-200/80 bg-amber-50 p-3 text-xs leading-relaxed text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300"
          role="status"
        >
          {t('billing.pendingNotice')}
        </div>
      )}

      {hasError ? (
        <div
          className="flex items-center justify-between gap-4 rounded-xl border border-red-200/80 bg-red-50 p-4 text-xs text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
          role="alert"
        >
          <span>{t('billing.loadError')}</span>
          <button
            className="font-medium underline hover:text-red-800 dark:hover:text-red-300"
            onClick={onRetry}
            type="button"
          >
            {t('billing.retry')}
          </button>
        </div>
      ) : isLoading ? (
        <div className="grid gap-3 md:grid-cols-3" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <div
              className="h-[212px] animate-pulse rounded-xl border border-black/[0.06] bg-neutral-50 dark:border-white/[0.06] dark:bg-white/[0.02]"
              key={index}
            />
          ))}
        </div>
      ) : specs.length === 0 ? (
        <div className="rounded-xl border border-black/[0.06] p-6 text-center text-xs text-neutral-500 dark:border-white/[0.06] dark:text-neutral-400">
          {t('billing.noPlans')}
        </div>
      ) : (
        <div
          aria-label={t('billing.plansLabel')}
          className="grid gap-3 md:grid-cols-3"
          role={canManage ? 'radiogroup' : 'group'}
        >
          {specs.map((spec) => {
            const isSelected = spec.key === selectedKey
            const hasTrial = spec.trialDays > 0
            const content = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                      {spec.displayName}
                    </p>
                    <p className="mt-1 text-[12px] text-neutral-500 dark:text-neutral-400">
                      {t('billing.specLine', {
                        cpu: spec.cpuCores,
                        memory: spec.memoryGb,
                        storage: spec.mdbSizeGb,
                      })}
                    </p>
                  </div>
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-all ${
                      isSelected
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                        : 'border border-neutral-300 dark:border-neutral-600'
                    }`}
                    aria-hidden="true"
                  >
                    {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                  </span>
                </div>

                <p className="mt-4 flex items-baseline gap-1.5">
                  <span className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                    {formatPrice(spec.unitPriceCents, spec.currency)}
                  </span>
                  <span className="text-[12px] text-neutral-500 dark:text-neutral-400">
                    {t('billing.perMonth')}
                  </span>
                </p>

                <span
                  className={`mt-3 inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${
                    hasTrial
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                      : 'bg-black/[0.05] text-neutral-600 dark:bg-white/[0.08] dark:text-neutral-300'
                  }`}
                >
                  {hasTrial
                    ? t('billing.trialBadge', { count: spec.trialDays })
                    : t('billing.noTrial')}
                </span>

                <p className="mt-3 text-[12px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                  {hasTrial
                    ? t('billing.trialChargeNote', { count: spec.trialDays })
                    : t('billing.noTrialChargeNote')}
                </p>
                <p className="mt-3 text-[12px] leading-relaxed text-neutral-400 dark:text-neutral-500">
                  {t('billing.planDescription')}
                </p>
              </>
            )

            const cardClass = `flex h-full flex-col rounded-xl border p-4 text-left transition-colors ${
              isSelected
                ? 'border-neutral-900 bg-neutral-50/80 dark:border-white dark:bg-white/[0.05]'
                : 'border-black/[0.08] hover:border-neutral-300 dark:border-white/[0.08] dark:hover:border-white/[0.2]'
            }`

            return canManage ? (
              <button
                aria-checked={isSelected}
                className={cardClass}
                key={spec.key}
                onClick={() => onSelect(spec.key)}
                role="radio"
                type="button"
              >
                {content}
              </button>
            ) : (
              <div className={cardClass} key={spec.key}>
                {content}
              </div>
            )
          })}
        </div>
      )}

      {canManage ? (
        <section className="space-y-4 rounded-xl border border-black/[0.06] p-5 dark:border-white/[0.06]">
          <div className="flex items-start gap-2.5">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
            <p className="text-[12px] leading-relaxed text-neutral-500 dark:text-neutral-400">
              {t('billing.checkoutNote')}
            </p>
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-relaxed text-neutral-700 dark:text-neutral-300">
            <input
              checked={consent}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-black/[0.2] accent-neutral-900 dark:accent-white"
              disabled={submitting}
              onChange={(event) => onConsentChange(event.target.checked)}
              type="checkbox"
            />
            <span>{t('billing.consent')}</span>
          </label>

          {errorMessage && (
            <p className="text-xs text-red-600 dark:text-red-400" role="alert">
              {errorMessage}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-1.5 text-[12px] text-neutral-500 dark:text-neutral-400">
              <CreditCard className="h-3.5 w-3.5" />
              {selectedSpec
                ? t('billing.selectedSummary', {
                    plan: selectedSpec.displayName,
                    price: formatPrice(selectedSpec.unitPriceCents, selectedSpec.currency),
                  })
                : t('billing.selectPrompt')}
            </p>
            <button
              className="flex h-9 items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 text-[13px] font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
              disabled={!selectedSpec || !consent || submitting}
              onClick={onSubmit}
              type="button"
            >
              {submitting ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>{t('billing.subscribing')}</span>
                </>
              ) : (
                <span>{t('billing.subscribeAction')}</span>
              )}
            </button>
          </div>
        </section>
      ) : (
        <p
          className="rounded-xl border border-black/[0.06] p-4 text-xs text-neutral-500 dark:border-white/[0.06] dark:text-neutral-400"
          role="status"
        >
          {t('billing.ownerOnly')}
        </p>
      )}
    </div>
  )
}
