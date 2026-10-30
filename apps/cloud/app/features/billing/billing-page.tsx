import { useNavigate } from '@tanstack/react-router'
import { CreditCard } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { Subscription } from '../../service/cloud-api'

import { CloudApiError, cloudApi } from '../../service/cloud-api'
import { useCloudAppState } from '../../state/cloud-app-state'
import { formatPrice, newestFirst } from './billing-format'
import { CancelSubscriptionDialog } from './cancel-subscription-dialog'
import { readCheckoutAttempt } from './checkout-attempt'
import { SubscriptionStatus } from './subscription-status'

const liveStatuses = new Set(['TRIAL', 'ACTIVE', 'PAST_DUE', 'PENDING_CANCEL'])

function errorKey(error: unknown, fallback: string): string {
  if (!(error instanceof CloudApiError)) return fallback
  if (error.status === 0) return 'billing.errors.network'
  switch (error.code) {
    case 'subscription.cannot-cancel':
      return 'billing.errors.cannotCancel'
    default:
      return fallback
  }
}

export function BillingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { activeOrganization, clusters, user } = useCloudAppState()
  const organizationId = activeOrganization?.id

  const [specs, setSpecs] = useState<Awaited<ReturnType<typeof cloudApi.specs>>>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasLoadError, setHasLoadError] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [attempt] = useState(() => readCheckoutAttempt())
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null)

  const load = useCallback(
    async (mode: 'full' | 'subscriptions') => {
      if (!organizationId) return
      if (mode === 'subscriptions') setIsRefreshing(true)
      else {
        setIsLoading(true)
        setHasLoadError(false)
      }
      try {
        const [nextSpecs, nextSubscriptions] = await Promise.all([
          mode === 'full' ? cloudApi.specs() : Promise.resolve(null),
          cloudApi.subscriptions(organizationId),
        ])
        if (nextSpecs) setSpecs(nextSpecs)
        setSubscriptions(nextSubscriptions)
      } catch (error) {
        if (error instanceof CloudApiError && error.status === 401) {
          void navigate({ to: '/auth' })
          return
        }
        if (mode === 'full') setHasLoadError(true)
      } finally {
        if (mode === 'subscriptions') setIsRefreshing(false)
        else setIsLoading(false)
      }
    },
    [navigate, organizationId],
  )

  useEffect(() => {
    if (!organizationId) return
    setSubscriptions([])
    setCancelError(null)
    void load('full')
  }, [load, organizationId])

  const orderedSubscriptions = useMemo(() => newestFirst(subscriptions), [subscriptions])
  const subscription = orderedSubscriptions.find((item) => liveStatuses.has(item.status)) ?? null

  const shouldPoll = subscription?.resourceState === 'PROVISIONING'

  useEffect(() => {
    if (!shouldPoll) return
    const timer = window.setInterval(() => void load('subscriptions'), 4000)
    return () => window.clearInterval(timer)
  }, [load, shouldPoll])

  useEffect(() => {
    if (!organizationId || isLoading || hasLoadError || subscription) return
    void navigate({
      to: '/onboarding',
      search: { organizationId, subscriptionId: undefined, createOrganization: false },
      replace: true,
    })
  }, [hasLoadError, isLoading, navigate, organizationId, subscription])

  const cluster = subscription
    ? (clusters.find((item) => item.id === subscription.clusterId) ?? null)
    : null
  const specKey =
    cluster?.specKey ??
    (attempt && subscription && attempt.subscriptionId === subscription.id ? attempt.specKey : null)
  const spec = specKey ? (specs.find((item) => item.key === specKey) ?? null) : null
  const canManage =
    !activeOrganization?.ownerEmail ||
    activeOrganization.ownerEmail.toLowerCase() === (user?.email ?? '').toLowerCase()

  const refresh = () => {
    void load('subscriptions')
  }

  const confirmCancel = async () => {
    if (!organizationId || !subscription || isCancelling) return
    setIsCancelling(true)
    setCancelError(null)
    try {
      const updated = await cloudApi.cancelAtPeriodEnd(organizationId, subscription.id)
      setSubscriptions((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
      setCancelOpen(false)
    } catch (error) {
      if (error instanceof CloudApiError && error.status === 401) {
        void navigate({ to: '/auth' })
        return
      }
      setCancelError(t(errorKey(error, 'billing.errors.cancelFailed')))
    } finally {
      setIsCancelling(false)
    }
  }

  return (
    <div className="flex h-full flex-1 flex-col overflow-y-auto">
      <header className="flex shrink-0 items-center justify-between border-b border-black/[0.05] px-6 py-4 dark:border-white/[0.05]">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">
            {t('billing.title')}
          </h1>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            {t('billing.subtitle', {
              organization: activeOrganization?.name ?? t('billing.organizationFallback'),
            })}
          </p>
        </div>
        <CreditCard className="h-4 w-4 text-neutral-400" />
      </header>

      <div className="max-w-4xl space-y-6 p-6">
        {!organizationId || isLoading ? (
          <p className="text-xs text-neutral-400">{t('billing.loading')}</p>
        ) : hasLoadError ? (
          <div
            className="flex items-center justify-between gap-4 rounded-xl border border-red-200/80 bg-red-50 p-4 text-xs text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
            role="alert"
          >
            <span>{t('billing.loadError')}</span>
            <button
              className="font-medium underline hover:text-red-800 dark:hover:text-red-300"
              onClick={() => void load('full')}
              type="button"
            >
              {t('billing.retry')}
            </button>
          </div>
        ) : subscription ? (
          <SubscriptionStatus
            canManage={canManage}
            cancelButtonRef={cancelButtonRef}
            clusterName={cluster?.name ?? null}
            isRefreshing={isRefreshing}
            spec={spec}
            subscription={subscription}
            onCancel={() => {
              setCancelError(null)
              setCancelOpen(true)
            }}
            onRefresh={refresh}
          />
        ) : (
          <p className="text-xs text-neutral-400">{t('billing.loading')}</p>
        )}
      </div>

      <CancelSubscriptionDialog
        errorMessage={cancelError}
        open={cancelOpen}
        periodEnd={subscription?.currentPeriodEnd}
        planName={spec?.displayName ?? t('billing.planUnknown')}
        price={spec ? formatPrice(spec.unitPriceCents, spec.currency) : null}
        returnFocusRef={cancelButtonRef}
        submitting={isCancelling}
        onConfirm={() => void confirmCancel()}
        onOpenChange={setCancelOpen}
      />
    </div>
  )
}
