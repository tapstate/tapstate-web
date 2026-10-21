import type { RefObject } from 'react'

import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { Spec, Subscription } from '../../service/cloud-api'

import { formatDate, formatPrice } from './billing-format'

const statusTone: Record<string, string> = {
  TRIAL: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  ACTIVE: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  PENDING_CANCEL: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  PENDING_PAYMENT: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  PAST_DUE: 'bg-red-500/10 text-red-700 dark:text-red-400',
  CANCELLED: 'bg-black/[0.06] text-neutral-600 dark:bg-white/[0.08] dark:text-neutral-300',
}

const statusKey: Record<string, string> = {
  TRIAL: 'billing.status.TRIAL',
  ACTIVE: 'billing.status.ACTIVE',
  PENDING_CANCEL: 'billing.status.PENDING_CANCEL',
  PENDING_PAYMENT: 'billing.status.PENDING_PAYMENT',
  PAST_DUE: 'billing.status.PAST_DUE',
  CANCELLED: 'billing.status.CANCELLED',
}

const autoRenewOn = new Set(['TRIAL', 'ACTIVE', 'PAST_DUE'])

function periodLineKey(status: string) {
  switch (status) {
    case 'TRIAL':
      return 'billing.period.trialEnds'
    case 'ACTIVE':
      return 'billing.period.nextBilled'
    case 'PENDING_CANCEL':
      return 'billing.period.ends'
    case 'PAST_DUE':
      return 'billing.period.pastDue'
    case 'PENDING_PAYMENT':
      return 'billing.period.awaitingPayment'
    default:
      return 'billing.period.ended'
  }
}

interface SubscriptionStatusProps {
  canManage: boolean
  cancelButtonRef: RefObject<HTMLButtonElement | null>
  clusterName?: string | null
  isRefreshing: boolean
  spec: Spec | null
  subscription: Subscription
  onCancel: () => void
  onRefresh: () => void
}

export function SubscriptionStatus({
  canManage,
  cancelButtonRef,
  clusterName,
  isRefreshing,
  spec,
  subscription,
  onCancel,
  onRefresh,
}: SubscriptionStatusProps) {
  const { t, i18n } = useTranslation()
  const status = subscription.status
  const isProvisioning = subscription.resourceState === 'PROVISIONING'
  const progressPercent = Math.min(100, Math.max(0, subscription.installProgress?.percent ?? 0))
  const periodLine = t(periodLineKey(status), {
    date: formatDate(subscription.currentPeriodEnd, i18n.language),
  })

  return (
    <div className="space-y-4">
      <section className="space-y-4 rounded-xl border border-black/[0.06] p-5 dark:border-white/[0.06]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${
                  statusTone[status] ?? statusTone.CANCELLED
                }`}
              >
                {t(statusKey[status] ?? 'billing.status.UNKNOWN')}
              </span>
              <span className="text-[12px] text-neutral-500 dark:text-neutral-400">
                {periodLine}
              </span>
            </div>
            <p className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-white">
              {spec?.displayName ?? t('billing.planUnknown')}
            </p>
            {spec && (
              <p className="text-[12px] text-neutral-500 dark:text-neutral-400">
                {t('billing.specLine', {
                  cpu: spec.cpuCores,
                  memory: spec.memoryGb,
                  storage: spec.mdbSizeGb,
                })}
                {' · '}
                {t('billing.priceLine', {
                  price: formatPrice(spec.unitPriceCents, spec.currency),
                })}
              </p>
            )}
          </div>
          <button
            className="flex h-8 items-center gap-1.5 rounded-lg border border-black/[0.1] bg-white px-3 text-[12px] font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:border-white/[0.12] dark:bg-[#1a1b1e] dark:text-neutral-300 dark:hover:bg-white/[0.05]"
            disabled={isRefreshing}
            onClick={onRefresh}
            type="button"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{t('billing.refresh')}</span>
          </button>
        </div>

        {isProvisioning && (
          <div className="space-y-2" role="status">
            <div className="flex items-center justify-between text-[12px] text-neutral-600 dark:text-neutral-300">
              <span>{t('billing.provisioning')}</span>
              <span className="font-mono">{progressPercent}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-neutral-900 transition-all dark:bg-white"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        <dl className="divide-y divide-black/[0.04] text-[12px] dark:divide-white/[0.04]">
          <div className="flex items-center justify-between gap-4 py-2.5">
            <dt className="text-neutral-500 dark:text-neutral-400">{t('billing.autoRenew')}</dt>
            <dd className="font-medium text-neutral-900 dark:text-white">
              {autoRenewOn.has(status) ? t('billing.autoRenewOn') : t('billing.autoRenewOff')}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-2.5">
            <dt className="text-neutral-500 dark:text-neutral-400">{t('billing.periodLabel')}</dt>
            <dd className="text-neutral-900 dark:text-white">
              {formatDate(subscription.currentPeriodStart, i18n.language)} –{' '}
              {formatDate(subscription.currentPeriodEnd, i18n.language)}
            </dd>
          </div>
          {clusterName && (
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-neutral-500 dark:text-neutral-400">
                {t('billing.clusterLabel')}
              </dt>
              <dd className="truncate font-mono text-neutral-900 dark:text-white">{clusterName}</dd>
            </div>
          )}
          <div className="flex items-center justify-between gap-4 py-2.5">
            <dt className="text-neutral-500 dark:text-neutral-400">
              {t('billing.subscriptionIdLabel')}
            </dt>
            <dd className="truncate font-mono text-neutral-500 dark:text-neutral-400">
              {subscription.id}
            </dd>
          </div>
        </dl>

        {status === 'PENDING_CANCEL' && (
          <div
            className="flex items-start gap-2.5 rounded-lg border border-amber-200/80 bg-amber-50 p-3 text-[12px] leading-relaxed text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300"
            role="status"
          >
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              {t('billing.cancelPendingNote', {
                date: formatDate(subscription.currentPeriodEnd, i18n.language),
              })}
            </span>
          </div>
        )}

        {status === 'PAST_DUE' && (
          <div
            className="flex items-start gap-2.5 rounded-lg border border-red-200/80 bg-red-50 p-3 text-[12px] leading-relaxed text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{t('billing.pastDueNote')}</span>
          </div>
        )}

        {status === 'PENDING_PAYMENT' && (
          <div
            className="flex items-start gap-2.5 rounded-lg border border-blue-200/80 bg-blue-50 p-3 text-[12px] leading-relaxed text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300"
            role="status"
          >
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{t('billing.awaitingPaymentNote')}</span>
          </div>
        )}

        {subscription.resourceState === 'READY' && (
          <div
            className="flex items-center gap-2 text-[12px] text-emerald-700 dark:text-emerald-400"
            role="status"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{t('billing.resourcesReady')}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-black/[0.04] pt-4 dark:border-white/[0.04]">
          {canManage && (status === 'TRIAL' || status === 'ACTIVE') ? (
            <button
              className="h-9 rounded-lg border border-black/[0.1] bg-white px-4 text-[13px] font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-white/[0.12] dark:bg-[#1a1b1e] dark:text-neutral-300 dark:hover:bg-white/[0.05]"
              onClick={onCancel}
              ref={cancelButtonRef}
              type="button"
            >
              {t('billing.cancelAction')}
            </button>
          ) : null}
          {!canManage && (
            <span className="text-[12px] text-neutral-500 dark:text-neutral-400">
              {t('billing.ownerOnly')}
            </span>
          )}
        </div>
      </section>
    </div>
  )
}
