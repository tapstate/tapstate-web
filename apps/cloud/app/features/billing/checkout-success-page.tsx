import { useNavigate } from '@tanstack/react-router'
import { AlertCircle, ArrowRight, Check, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { Subscription } from '../../service/cloud-api'

import { CloudApiError, cloudApi } from '../../service/cloud-api'
import { useCloudAppState } from '../../state/cloud-app-state'
import { clusterDnsLabel, suggestedClusterDisplayName } from '../clusters/cluster-name'
import { newestFirst } from './billing-format'
import {
  clearCheckoutAttempt,
  readCheckoutAttempt,
  rememberCheckoutAttempt,
} from './checkout-attempt'

type Phase = 'resolving' | 'awaiting-payment' | 'provisioning' | 'ready' | 'error'

interface ProvisioningTarget {
  clusterName: string
  region: string
}

export function CheckoutSuccessPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { activeOrganization, organizations } = useCloudAppState()
  const attempt = useMemo(() => readCheckoutAttempt(), [])
  const organizationId = attempt?.orgId ?? activeOrganization?.id ?? null
  const [resolvedOrganizationName, setResolvedOrganizationName] = useState<string | null>(null)
  const organizationName =
    organizations.find((item) => item.id === organizationId)?.name ?? resolvedOrganizationName

  const [phase, setPhase] = useState<Phase>('resolving')
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [target, setTarget] = useState<ProvisioningTarget | null>(null)
  const [errorKey, setErrorKey] = useState<string | null>(null)

  useEffect(() => {
    if (!organizationId || organizationName) return
    let active = true
    const resolve = async () => {
      try {
        const list = await cloudApi.organizations()
        if (!active) return
        const name = list.find((item) => item.id === organizationId)?.name
        if (name) {
          setResolvedOrganizationName(name)
          return
        }
        setPhase('error')
        setErrorKey('billing.success.error')
      } catch (error) {
        if (!active) return
        if (error instanceof CloudApiError && error.status === 401) {
          void navigate({ to: '/auth' })
          return
        }
        setPhase('error')
        setErrorKey('billing.success.error')
      }
    }
    void resolve()
    return () => {
      active = false
    }
  }, [navigate, organizationId, organizationName])

  useEffect(() => {
    if (!organizationId || !organizationName) return
    let active = true
    let timer: number | undefined
    let finalized = false

    const resolveTarget = async (): Promise<ProvisioningTarget> => {
      const [regions, clusters] = await Promise.all([
        cloudApi.regions(),
        cloudApi.clusters(organizationId),
      ])
      const stored = readCheckoutAttempt()
      const region =
        regions.find((item) => item.open && item.code === stored?.region)?.code ??
        regions.find((item) => item.open)?.code
      if (!region) throw new CloudApiError('No open region is available.', 503)
      const taken = new Set(
        clusters
          .filter((cluster) => cluster.state !== 'TERMINATED')
          .map((cluster) => clusterDnsLabel(cluster.name)),
      )
      const preferred = stored?.clusterName?.trim()
      return {
        region,
        clusterName:
          preferred && !taken.has(clusterDnsLabel(preferred))
            ? preferred
            : suggestedClusterDisplayName(organizationName, clusters),
      }
    }

    const resolveSubscription = async (): Promise<Subscription> => {
      const stored = readCheckoutAttempt()
      if (stored && stored.orgId === organizationId) {
        try {
          return await cloudApi.subscriptionById(organizationId, stored.subscriptionId)
        } catch (error) {
          if (!(error instanceof CloudApiError) || error.status !== 404) throw error
          clearCheckoutAttempt()
        }
      }
      const candidates = newestFirst(await cloudApi.subscriptions(organizationId)).filter(
        (item) => item.status !== 'CANCELLED',
      )
      const newest = candidates[0]
      if (!newest) throw new CloudApiError('No subscription matches this checkout.', 404)
      rememberCheckoutAttempt({
        orgId: organizationId,
        subscriptionId: newest.id,
        specKey: stored?.specKey ?? '',
        clientRequestId: stored?.clientRequestId ?? '',
        startedAt: new Date().toISOString(),
        region: stored?.orgId === organizationId ? stored.region : undefined,
        clusterName: stored?.orgId === organizationId ? stored.clusterName : undefined,
      })
      return newest
    }

    const openDeployment = (subscriptionId: string) => {
      clearCheckoutAttempt()
      void navigate({
        to: '/onboarding',
        search: { organizationId, subscriptionId, createOrganization: false },
        replace: true,
      })
    }

    const tick = async () => {
      let keepPolling = true
      try {
        const current = await resolveSubscription()
        if (!active) return
        setSubscription(current)

        if (current.status === 'PENDING_PAYMENT') {
          setPhase('awaiting-payment')
        } else if (current.status === 'CANCELLED') {
          setPhase('error')
          setErrorKey('billing.success.ended')
          keepPolling = false
        } else if (current.status === 'TRIAL' || current.status === 'ACTIVE') {
          if (current.clusterId) {
            openDeployment(current.id)
            keepPolling = false
          } else if (!current.resourceState) {
            setPhase('provisioning')
            if (!finalized) {
              const provisioningTarget = await resolveTarget()
              if (!active) return
              setTarget(provisioningTarget)
              try {
                const updated = await cloudApi.finalizeProvisioning(
                  organizationId,
                  current.id,
                  provisioningTarget,
                )
                finalized = true
                if (updated.clusterId) {
                  openDeployment(current.id)
                  keepPolling = false
                }
              } catch (error) {
                if (
                  error instanceof CloudApiError &&
                  error.code === 'subscription.pending-payment'
                ) {
                  setPhase('awaiting-payment')
                } else {
                  throw error
                }
              }
            }
          } else {
            setPhase('provisioning')
          }
        } else {
          setPhase('error')
          setErrorKey('billing.success.unavailable')
          keepPolling = false
        }
      } catch (error) {
        if (!active) return
        if (error instanceof CloudApiError && error.status === 401) {
          void navigate({ to: '/auth' })
          return
        }
        setPhase('error')
        setErrorKey('billing.success.error')
        keepPolling = false
      }

      if (active && keepPolling) timer = window.setTimeout(() => void tick(), 3000)
    }

    void tick()
    return () => {
      active = false
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [navigate, organizationId, organizationName])

  const progress = Math.min(100, Math.max(0, subscription?.installProgress?.percent ?? 0))
  const backToPlans = () =>
    void navigate({
      to: '/billing',
      search: { organizationId: organizationId ?? undefined },
    })
  const openClusters = () =>
    void navigate({
      to: '/clusters',
      search: { organizationId: organizationId ?? undefined },
    })

  return (
    <div className="flex h-full flex-1 flex-col overflow-y-auto">
      <header className="flex shrink-0 items-center justify-between border-b border-black/[0.05] px-6 py-4 dark:border-white/[0.05]">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">
            {t('billing.success.title')}
          </h1>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            {t('billing.success.subtitle')}
          </p>
        </div>
      </header>

      <div className="max-w-2xl space-y-6 p-6">
        {phase === 'error' ? (
          <div className="space-y-4 rounded-xl border border-red-200/80 bg-red-50 p-5 dark:border-red-900/50 dark:bg-red-950/30">
            <div className="flex items-start gap-2.5 text-sm text-red-700 dark:text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{t(errorKey ?? 'billing.success.error')}</span>
            </div>
            <div className="flex gap-2">
              <button
                className="h-9 rounded-lg bg-neutral-900 px-4 text-[13px] font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
                onClick={openClusters}
                type="button"
              >
                {t('billing.success.openClusters')}
              </button>
              <button
                className="h-9 rounded-lg border border-black/[0.1] bg-white px-4 text-[13px] font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-white/[0.12] dark:bg-[#1a1b1e] dark:text-neutral-300 dark:hover:bg-white/[0.05]"
                onClick={backToPlans}
                type="button"
              >
                {t('billing.success.viewSubscription')}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5 rounded-xl border border-black/[0.06] p-5 dark:border-white/[0.06]">
            <ol className="space-y-3">
              <Step
                done={phase !== 'resolving' && phase !== 'awaiting-payment'}
                label={t('billing.success.stepPayment')}
                pending={phase === 'resolving' || phase === 'awaiting-payment'}
              />
              <Step
                done={phase === 'ready'}
                label={t('billing.success.stepProvisioning', { percent: progress })}
                pending={phase === 'provisioning'}
              />
              <Step
                done={phase === 'ready'}
                label={t('billing.success.stepReady')}
                pending={false}
              />
            </ol>

            {phase === 'provisioning' && (
              <div className="space-y-2" role="status">
                <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
                  <div
                    className="h-full rounded-full bg-neutral-900 transition-all dark:bg-white"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-[12px] text-neutral-500 dark:text-neutral-400">
                  {target
                    ? t('billing.success.provisioningNote', { cluster: target.clusterName })
                    : t('billing.success.provisioningNotePending')}
                </p>
              </div>
            )}

            {phase === 'resolving' && (
              <p className="flex items-center gap-2 text-[12px] text-neutral-500 dark:text-neutral-400">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                {t('billing.success.resolving')}
              </p>
            )}

            {phase === 'awaiting-payment' && (
              <p className="flex items-center gap-2 text-[12px] text-neutral-500 dark:text-neutral-400">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                {t('billing.success.awaitingPayment')}
              </p>
            )}

            {phase === 'ready' && (
              <div className="space-y-3">
                <p className="text-[12px] text-neutral-500 dark:text-neutral-400">
                  {target
                    ? t('billing.success.readyNote', { cluster: target.clusterName })
                    : t('billing.success.readyNoteGeneric')}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="flex h-9 items-center gap-1.5 rounded-lg bg-neutral-900 px-4 text-[13px] font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
                    onClick={openClusters}
                    type="button"
                  >
                    <span>{t('billing.success.openClusters')}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className="h-9 rounded-lg border border-black/[0.1] bg-white px-4 text-[13px] font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-white/[0.12] dark:bg-[#1a1b1e] dark:text-neutral-300 dark:hover:bg-white/[0.05]"
                    onClick={backToPlans}
                    type="button"
                  >
                    {t('billing.success.viewSubscription')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Step({ done, label, pending }: { done: boolean; label: string; pending: boolean }) {
  return (
    <li className="flex items-center gap-2.5 text-[13px]">
      <span
        className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full ${
          done
            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
            : pending
              ? 'bg-black/[0.06] text-neutral-500 dark:bg-white/[0.08] dark:text-neutral-300'
              : 'border border-neutral-300 text-transparent dark:border-neutral-600'
        }`}
        aria-hidden="true"
      >
        {done ? (
          <Check className="h-2.5 w-2.5 stroke-[3]" />
        ) : pending ? (
          <RefreshCw className="h-2.5 w-2.5 animate-spin" />
        ) : null}
      </span>
      <span
        className={
          done ? 'text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400'
        }
      >
        {label}
      </span>
    </li>
  )
}
