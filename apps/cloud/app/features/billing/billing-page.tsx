import { useNavigate } from '@tanstack/react-router'
import { CreditCard } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { Subscription } from '../../service/cloud-api'

import { CloudApiError, cloudApi } from '../../service/cloud-api'
import { useCloudAppState } from '../../state/cloud-app-state'
import { formatPrice, newestFirst } from './billing-format'
import { CancelSubscriptionDialog } from './cancel-subscription-dialog'
import {
  clearCheckoutAttempt,
  newClientRequestId,
  readCheckoutAttempt,
  rememberCheckoutAttempt,
} from './checkout-attempt'
import { navigateToCheckout } from './checkout-navigation'
import { PlanSelection } from './plan-selection'
import { SubscriptionStatus } from './subscription-status'

const liveStatuses = new Set(['TRIAL', 'ACTIVE', 'PAST_DUE', 'PENDING_CANCEL'])

function errorKey(error: unknown, fallback: string): string {
  if (!(error instanceof CloudApiError)) return fallback
  if (error.status === 0) return 'billing.errors.network'
  switch (error.code) {
    case 'subscription.spec-not-found':
      return 'billing.errors.specNotFound'
    case 'subscription.pricing-not-configured':
      return 'billing.errors.pricingNotConfigured'
    case 'subscription.already-active':
      return 'billing.errors.alreadyActive'
    case 'subscription.pending-payment':
      return 'billing.errors.pendingPayment'
    case 'subscription.not-active':
      return 'billing.errors.notActive'
    case 'subscription.cannot-cancel':
      return 'billing.errors.cannotCancel'
    case 'org.limit-reached':
      return 'billing.errors.orgLimitReached'
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
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [consent, setConsent] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [hasLoadError, setHasLoadError] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(() => readCheckoutAttempt())
  const requestIdRef = useRef<string | null>(null)
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null)
  const loadGenerationRef = useRef(0)

  const load = useCallback(
    async (mode: 'full' | 'subscriptions') => {
      if (!organizationId) return
      const generation = loadGenerationRef.current
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
        if (generation !== loadGenerationRef.current) return
        if (nextSpecs) setSpecs(nextSpecs)
        setSubscriptions(nextSubscriptions)
      } catch (error) {
        if (generation !== loadGenerationRef.current) return
        if (error instanceof CloudApiError && error.status === 401) {
          void navigate({ to: '/auth' })
          return
        }
        if (mode === 'full') setHasLoadError(true)
      } finally {
        if (generation === loadGenerationRef.current) {
          if (mode === 'subscriptions') setIsRefreshing(false)
          else setIsLoading(false)
        }
      }
    },
    [navigate, organizationId],
  )

  useEffect(() => {
    if (!organizationId) return
    const generation = ++loadGenerationRef.current
    setSubscriptions([])
    setSelectedKey(null)
    setConsent(false)
    setCheckoutError(null)
    setCancelError(null)
    setAttempt(readCheckoutAttempt())
    void load('full')
    return () => {
      if (loadGenerationRef.current === generation) loadGenerationRef.current += 1
    }
  }, [load, organizationId])

  useEffect(() => {
    if (specs.length === 0) return
    setSelectedKey((current) =>
      current && specs.some((spec) => spec.key === current) ? current : specs[0].key,
    )
  }, [specs])

  const orderedSubscriptions = useMemo(() => newestFirst(subscriptions), [subscriptions])
  const subscription = orderedSubscriptions.find((item) => liveStatuses.has(item.status)) ?? null
  const pendingSubscription =
    orderedSubscriptions.find((item) => item.status === 'PENDING_PAYMENT') ?? null

  const shouldPoll = subscription?.resourceState === 'PROVISIONING'

  useEffect(() => {
    if (!shouldPoll) return
    const timer = window.setInterval(() => void load('subscriptions'), 4000)
    return () => window.clearInterval(timer)
  }, [load, shouldPoll])

  const cluster = subscription
    ? (clusters.find((item) => item.id === subscription.clusterId) ?? null)
    : null
  const specKey =
    cluster?.specKey ??
    (attempt && subscription && attempt.subscriptionId === subscription.id ? attempt.specKey : null)
  const spec = specKey ? (specs.find((item) => item.key === specKey) ?? null) : null
  const selectedSpec = specs.find((item) => item.key === selectedKey) ?? null
  const canManage =
    !activeOrganization?.ownerEmail ||
    activeOrganization.ownerEmail.toLowerCase() === (user?.email ?? '').toLowerCase()

  const selectPlan = (key: string) => {
    setSelectedKey(key)
    setCheckoutError(null)
    requestIdRef.current = null
  }

  const startCheckout = async () => {
    if (!organizationId || !selectedSpec || !consent || isSubmitting) return
    if (!requestIdRef.current) requestIdRef.current = newClientRequestId()
    const clientRequestId = requestIdRef.current
    setIsSubmitting(true)
    setCheckoutError(null)
    try {
      const session = await cloudApi.createCheckout(organizationId, {
        specKey: selectedSpec.key,
        clientRequestId,
      })
      const nextAttempt = {
        orgId: organizationId,
        subscriptionId: session.subscriptionId,
        specKey: selectedSpec.key,
        clientRequestId,
        startedAt: new Date().toISOString(),
      }
      rememberCheckoutAttempt(nextAttempt)
      setAttempt(nextAttempt)
      navigateToCheckout(session.checkoutUrl)
    } catch (error) {
      if (error instanceof CloudApiError && error.status === 401) {
        void navigate({ to: '/auth' })
        return
      }
      if (
        error instanceof CloudApiError &&
        (error.code === 'subscription.already-active' || error.status === 409)
      ) {
        await load('subscriptions')
      }
      setCheckoutError(t(errorKey(error, 'billing.errors.generic')))
    } finally {
      setIsSubmitting(false)
    }
  }

  const refresh = () => {
    void load('subscriptions')
  }

  const startOver = () => {
    clearCheckoutAttempt()
    setAttempt(null)
    requestIdRef.current = null
    setConsent(false)
    setCancelError(null)
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
        {!organizationId ? (
          <p className="text-xs text-neutral-400">{t('billing.loading')}</p>
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
            onStartOver={startOver}
          />
        ) : (
          <PlanSelection
            canManage={canManage}
            consent={consent}
            errorMessage={checkoutError}
            hasError={hasLoadError}
            isLoading={isLoading}
            pendingNotice={pendingSubscription !== null}
            selectedKey={selectedKey}
            specs={specs}
            submitting={isSubmitting}
            onConsentChange={setConsent}
            onRetry={() => void load('full')}
            onSelect={selectPlan}
            onSubmit={() => void startCheckout()}
          />
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
