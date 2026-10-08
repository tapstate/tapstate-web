import { Check, CreditCard } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { cloudApi, type Subscription } from '../../service/cloud-api'
import { useCloudAppState } from '../../state/cloud-app-state'

function dateLabel(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString()
}

export function BillingPage() {
  const { t } = useTranslation()
  const { activeOrganization, clusters, setClusters } = useCloudAppState()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [cancelError, setCancelError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const subscription =
    subscriptions.find((item) => item.status !== 'CANCELLED') ?? subscriptions[0] ?? null

  useEffect(() => {
    if (!activeOrganization) return
    let current = true
    setIsLoading(true)
    setSubscriptions([])
    setConfirmingId(null)
    setCancelError(false)
    setHasError(false)
    void cloudApi
      .subscriptions(activeOrganization.id)
      .then((value) => {
        if (current) setSubscriptions(value)
      })
      .catch(() => {
        if (current) {
          setSubscriptions([])
          setHasError(true)
        }
      })
      .finally(() => {
        if (current) setIsLoading(false)
      })
    return () => {
      current = false
    }
  }, [activeOrganization])

  const cancelSubscription = async (subscriptionId: string) => {
    if (!activeOrganization || cancellingId) return
    const orgId = activeOrganization.id
    setCancellingId(subscriptionId)
    setCancelError(false)
    try {
      const latest = await cloudApi.subscriptionById(orgId, subscriptionId)
      const cancelled =
        latest.status === 'CANCELLED'
          ? latest
          : await cloudApi.cancelSubscription(orgId, subscriptionId)
      if (cancelled.status !== 'CANCELLED') throw new Error('Cancellation not confirmed')
      setSubscriptions((current) =>
        current.map((item) => (item.id === subscriptionId ? cancelled : item)),
      )
      setConfirmingId(null)
      setClusters(await cloudApi.clusters(orgId))
    } catch {
      try {
        const latest = await cloudApi.subscriptionById(orgId, subscriptionId)
        if (latest.status === 'CANCELLED') {
          setSubscriptions((current) =>
            current.map((item) => (item.id === subscriptionId ? latest : item)),
          )
          setConfirmingId(null)
          setClusters(await cloudApi.clusters(orgId))
          return
        }
      } catch {
        // Keep the confirmation visible when the outcome cannot be checked.
      }
      setCancelError(true)
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <div className="flex h-full flex-1 flex-col overflow-y-auto">
      <header className="flex shrink-0 items-center justify-between border-b border-black/[0.05] px-6 py-4 dark:border-white/[0.05]">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">
            Plan &amp; Billing
          </h1>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            Subscription details for {activeOrganization?.name ?? 'your organization'}.
          </p>
        </div>
        <CreditCard className="h-4 w-4 text-neutral-400" />
      </header>

      <div className="max-w-4xl space-y-6 p-6">
        {subscriptions
          .filter((item) => ['TRIAL', 'ACTIVE', 'PAST_DUE'].includes(item.status))
          .map((item) => (
            <section
              className="space-y-3 rounded-xl border border-black/[0.06] p-5 dark:border-white/[0.06]"
              key={item.id}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                    {t('onboarding.cancelSubscription')}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {clusters.find((cluster) => cluster.id === item.clusterId)?.name ??
                      item.clusterId ??
                      item.id}
                  </p>
                </div>
                <button
                  className="rounded-lg border border-black/[0.1] bg-white px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-white/[0.12] dark:bg-[#1a1b1e] dark:text-neutral-300"
                  onClick={() => {
                    setConfirmingId(item.id)
                    setCancelError(false)
                  }}
                  type="button"
                >
                  {t('onboarding.cancelSubscription')}
                </button>
              </div>
              {confirmingId === item.id && (
                <div className="space-y-3 rounded-lg border border-red-200/80 bg-red-50/80 p-4 dark:border-red-900/50 dark:bg-red-950/30">
                  <p className="text-xs leading-relaxed text-red-700 dark:text-red-300">
                    {t('sections.billing.cancelWarning')}
                  </p>
                  {cancelError && (
                    <p className="text-xs text-red-700 dark:text-red-300" role="alert">
                      {t('onboarding.cancelSubscriptionError')}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      className="rounded-lg border border-black/[0.1] bg-white px-3 py-2 text-xs text-neutral-700 dark:border-white/[0.12] dark:bg-[#1a1b1e] dark:text-neutral-300"
                      disabled={cancellingId !== null}
                      onClick={() => setConfirmingId(null)}
                      type="button"
                    >
                      {t('onboarding.keepSubscription')}
                    </button>
                    <button
                      className="rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      disabled={cancellingId !== null}
                      onClick={() => void cancelSubscription(item.id)}
                      type="button"
                    >
                      {cancellingId === item.id
                        ? t('onboarding.cancellingSubscription')
                        : t('onboarding.confirmCancelSubscription')}
                    </button>
                  </div>
                </div>
              )}
            </section>
          ))}
        <section className="space-y-4 rounded-xl border border-black/[0.06] p-5 dark:border-white/[0.06]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                {activeOrganization?.name ?? '—'}
              </span>
              {subscription && (
                <span className="rounded bg-black/[0.04] px-2 py-0.5 font-mono text-xs text-neutral-600 dark:bg-white/[0.06] dark:text-neutral-300">
                  {subscription.status}
                </span>
              )}
            </div>
            {subscription && (
              <span className="font-mono text-xs text-neutral-400">
                Period ends {dateLabel(subscription.currentPeriodEnd)}
              </span>
            )}
          </div>

          {isLoading ? (
            <p className="text-xs text-neutral-400">Loading subscription details...</p>
          ) : hasError ? (
            <p className="text-xs text-red-600 dark:text-red-400" role="alert">
              Subscription details could not be loaded.
            </p>
          ) : subscription ? (
            <div className="divide-y divide-black/[0.04] font-mono text-xs dark:divide-white/[0.04]">
              <div className="flex items-center justify-between gap-4 py-2.5 text-neutral-600 dark:text-neutral-300">
                <span>Provisioning</span>
                <span className="flex items-center gap-1.5 text-neutral-900 dark:text-white">
                  <Check className="h-3.5 w-3.5" />
                  {subscription.provisioningAllowed ? 'Allowed' : 'Unavailable'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 py-2.5 text-neutral-600 dark:text-neutral-300">
                <span>Current period started</span>
                <span className="text-neutral-900 dark:text-white">
                  {dateLabel(subscription.currentPeriodStart)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 py-2.5 text-neutral-600 dark:text-neutral-300">
                <span>Subscription created</span>
                <span className="text-neutral-900 dark:text-white">
                  {dateLabel(subscription.createdAt)}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-neutral-400">No subscription is available.</p>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold tracking-wider text-neutral-400 uppercase">
            Subscription Items
          </h2>
          <div className="overflow-hidden rounded-xl border border-black/[0.06] dark:border-white/[0.06]">
            {subscription?.items?.length ? (
              <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                {subscription.items.map((item) => (
                  <div
                    className="flex items-center justify-between gap-4 px-4 py-3.5 text-xs"
                    key={item.id}
                  >
                    <div>
                      <div className="font-medium text-neutral-900 dark:text-white">
                        {item.itemTypeDisplayName ?? item.itemType}
                      </div>
                      {item.billingUnit && (
                        <div className="mt-0.5 text-[11px] text-neutral-400">
                          Billed per {item.billingUnit}
                        </div>
                      )}
                    </div>
                    <div className="text-right font-mono text-neutral-600 dark:text-neutral-300">
                      {item.includedQuantity !== undefined && (
                        <div>{item.includedQuantity.toLocaleString()} included</div>
                      )}
                      {item.unitPriceCents !== undefined && (
                        <div className="text-[11px] text-neutral-400">
                          {(item.unitPriceCents / 100).toLocaleString(undefined, {
                            style: 'currency',
                            currency: 'USD',
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-xs text-neutral-400">
                {hasError
                  ? 'Subscription items are unavailable.'
                  : 'No subscription items are listed.'}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
