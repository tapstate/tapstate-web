import { useNavigate } from '@tanstack/react-router'
import { AlertCircle, ArrowRight, Check, MapPin, Moon, RefreshCw, Sun } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import type { UserProfile } from '../../types'
import type { OnboardingWorkspace } from './onboarding-service'
import type { OnboardingInput } from './onboarding-types'

import {
  CloudApiError,
  cloudApi,
  type Cluster,
  type DeploymentProgress,
  type Organization,
  type Region,
  type Subscription,
} from '../../service/cloud-api'
import {
  isProvisioningCancelled,
  isProvisioningFailed,
  isWorkspaceReady,
} from './onboarding-adapter'
import { ProvisioningView, type ProvisioningUpdate } from './provisioning-view'
export type { OnboardingInput } from './onboarding-types'

interface OnboardingPageProps {
  darkMode: boolean
  setDarkMode: (enabled: boolean) => void
  user: UserProfile
  onComplete: (organization: Organization, cluster: Cluster) => void
  onCreateWorkspace: (input: OnboardingInput) => Promise<OnboardingWorkspace>
  isOpeningCluster: boolean
  entryError: string | null
}

type OnboardingScreen = 'form' | 'starting' | 'provisioning' | 'failed' | 'ready' | 'cancelled'

function observedUpdate(cluster: Cluster, subscription: Subscription): ProvisioningUpdate {
  return {
    key: `${cluster.state}:${subscription.resourceState ?? 'UNKNOWN'}`,
    observedAt: Date.now(),
    clusterState: cluster.state,
    resourceState: subscription.resourceState ?? null,
  }
}

async function refreshWorkspaceState(
  workspace: OnboardingWorkspace,
  onUnauthorized: () => void,
): Promise<OnboardingWorkspace> {
  const withAuthRedirect = <T,>(request: Promise<T>) =>
    request.catch((error: unknown) => {
      if (error instanceof CloudApiError && error.status === 401) onUnauthorized()
      throw error
    })
  const [subscription, cluster] = await Promise.all([
    withAuthRedirect(
      cloudApi.subscriptionById(workspace.organization.id, workspace.subscription.id),
    ),
    withAuthRedirect(cloudApi.cluster(workspace.organization.id, workspace.cluster.id)),
  ])

  return {
    ...workspace,
    subscription,
    cluster,
  }
}

function isSubscriptionCancelled(subscription: Subscription) {
  return subscription.status === 'CANCELLED'
}

function toSlug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

export function OnboardingPage({
  darkMode,
  setDarkMode,
  user,
  onComplete,
  onCreateWorkspace,
  isOpeningCluster,
  entryError,
}: OnboardingPageProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [regions, setRegions] = useState<Region[]>([])
  const [selectedRegionCode, setSelectedRegionCode] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [isLoadingRegions, setIsLoadingRegions] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasLoadError, setHasLoadError] = useState(false)
  const [hasSubmitError, setHasSubmitError] = useState(false)
  const [screen, setScreen] = useState<OnboardingScreen>('form')
  const [workspace, setWorkspace] = useState<OnboardingWorkspace | null>(null)
  const [updates, setUpdates] = useState<ProvisioningUpdate[]>([])
  const [deploymentProgress, setDeploymentProgress] = useState<DeploymentProgress | null>(null)
  const [hasPollingError, setHasPollingError] = useState(false)
  const [hasCleanupStatusError, setHasCleanupStatusError] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const [hasRetryError, setHasRetryError] = useState(false)
  const [isCancellingSubscription, setIsCancellingSubscription] = useState(false)
  const [hasCancelSubscriptionError, setHasCancelSubscriptionError] = useState(false)
  const [hasCancelStatusError, setHasCancelStatusError] = useState(false)
  const [isCancelOutcomeUnknown, setIsCancelOutcomeUnknown] = useState(false)
  const hasRedirectedToAuth = useRef(false)
  const autoEntryClusterId = useRef<string | null>(null)

  const redirectToAuth = () => {
    if (hasRedirectedToAuth.current) return
    hasRedirectedToAuth.current = true
    void navigate({ to: '/auth' })
  }

  const selectedRegion = useMemo(
    () => regions.find((region) => region.code === selectedRegionCode) ?? null,
    [regions, selectedRegionCode],
  )
  const organizationSlug = toSlug(organizationName)
  const clusterName = organizationSlug ? `${organizationSlug}-stream`.slice(0, 100) : ''

  const loadRegions = async () => {
    setIsLoadingRegions(true)
    setHasLoadError(false)
    try {
      const availableRegions = (await cloudApi.regions()).filter((region) => region.open)
      setRegions(availableRegions)
      setSelectedRegionCode((current) =>
        availableRegions.some((region) => region.code === current)
          ? current
          : (availableRegions[0]?.code ?? ''),
      )
    } catch {
      setHasLoadError(true)
    } finally {
      setIsLoadingRegions(false)
    }
  }

  useEffect(() => {
    void loadRegions()
  }, [])

  useEffect(() => {
    if ((screen !== 'provisioning' && screen !== 'failed') || !workspace) return
    if (
      screen === 'failed' &&
      deploymentProgress?.overallStatus === 'FAILED' &&
      deploymentProgress.operations.some((operation) => operation.status === 'FAILED')
    )
      return
    let active = true
    let timer: number | undefined

    const refresh = async () => {
      try {
        const [subscription, cluster, progress] = await Promise.all([
          cloudApi.subscriptionById(workspace.organization.id, workspace.subscription.id),
          cloudApi.cluster(workspace.organization.id, workspace.cluster.id),
          cloudApi
            .deploymentProgress(workspace.organization.id, workspace.subscription.id)
            .catch(() => null),
        ])
        if (!active) return
        const currentWorkspace = { ...workspace, subscription, cluster }
        setWorkspace(currentWorkspace)
        if (progress) setDeploymentProgress(progress)
        setHasPollingError(progress === null)
        const update = observedUpdate(cluster, subscription)
        setUpdates((current) =>
          current.some((item) => item.key === update.key) ? current : [...current, update],
        )

        if (screen === 'failed') {
          if (
            progress?.overallStatus === 'FAILED' &&
            progress.operations.some((operation) => operation.status === 'FAILED')
          )
            return
        } else {
          if (isProvisioningCancelled(cluster, subscription)) {
            setScreen('cancelled')
            return
          }
          if (isProvisioningFailed(cluster)) {
            setScreen('failed')
            return
          }
          if (isWorkspaceReady(cluster, subscription)) {
            setScreen('ready')
            return
          }
        }
      } catch (error) {
        if (!active) return
        if (error instanceof CloudApiError && error.status === 401) {
          void navigate({ to: '/auth' })
          return
        }
        setHasPollingError(true)
      }

      if (active) timer = window.setTimeout(() => void refresh(), 2500)
    }

    timer = window.setTimeout(() => void refresh(), 1500)
    return () => {
      active = false
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [deploymentProgress, navigate, screen, workspace])

  useEffect(() => {
    if (screen !== 'cancelled' || !workspace || workspace.cluster.state === 'TERMINATED') return
    let active = true
    let timer: number | undefined
    const refresh = async () => {
      try {
        const cluster = await cloudApi.cluster(workspace.organization.id, workspace.cluster.id)
        if (!active) return
        setWorkspace((current) => (current ? { ...current, cluster } : current))
        setHasCleanupStatusError(false)
        if (cluster.state === 'TERMINATED') return
      } catch (error) {
        if (!active) return
        if (error instanceof CloudApiError && error.status === 401) {
          redirectToAuth()
          return
        }
        setHasCleanupStatusError(true)
      }
      timer = window.setTimeout(() => void refresh(), 3000)
    }
    void refresh()
    return () => {
      active = false
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [screen, workspace?.organization.id, workspace?.cluster.id, workspace?.cluster.state])

  useEffect(() => {
    if (
      screen !== 'ready' ||
      !workspace ||
      !isWorkspaceReady(workspace.cluster, workspace.subscription)
    ) {
      return
    }
    if (autoEntryClusterId.current === workspace.cluster.id) return

    autoEntryClusterId.current = workspace.cluster.id
    onComplete(workspace.organization, workspace.cluster)
  }, [onComplete, screen, workspace])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setHasSubmitError(false)
    if (!selectedRegion || !organizationSlug) return

    setIsSubmitting(true)
    setScreen('starting')
    try {
      const result = await onCreateWorkspace({
        organizationName: organizationName.trim(),
        organizationSlug,
        region: selectedRegion,
        clusterName,
      })
      setWorkspace(result)
      setDeploymentProgress(null)
      setUpdates([observedUpdate(result.cluster, result.subscription)])
      if (isProvisioningCancelled(result.cluster, result.subscription)) {
        setScreen('cancelled')
      } else if (isProvisioningFailed(result.cluster)) {
        setScreen('failed')
      } else if (isWorkspaceReady(result.cluster, result.subscription)) {
        setScreen('ready')
      } else {
        setScreen('provisioning')
      }
    } catch {
      setHasSubmitError(true)
      setScreen('form')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRetry = async () => {
    if (!workspace || isRetrying || isCancellingSubscription || isCancelOutcomeUnknown) return
    setIsRetrying(true)
    setHasRetryError(false)
    setHasCancelSubscriptionError(false)
    setIsCancelOutcomeUnknown(false)
    try {
      const currentWorkspace = await refreshWorkspaceState(workspace, redirectToAuth)
      const { cluster: currentCluster, subscription } = currentWorkspace
      setWorkspace(currentWorkspace)
      const currentUpdate = observedUpdate(currentCluster, subscription)
      setUpdates((current) =>
        current.some((item) => item.key === currentUpdate.key)
          ? current
          : [...current, currentUpdate],
      )
      setHasPollingError(false)

      if (isSubscriptionCancelled(subscription)) {
        setScreen('cancelled')
        return
      }
      if (!isProvisioningFailed(currentCluster)) {
        setScreen(isWorkspaceReady(currentCluster, subscription) ? 'ready' : 'provisioning')
        return
      }

      const cluster = await cloudApi.retryCluster(workspace.organization.id, workspace.cluster.id)
      const nextWorkspace = { ...currentWorkspace, cluster }
      setWorkspace(nextWorkspace)
      setDeploymentProgress(null)
      const update = observedUpdate(cluster, subscription)
      setUpdates((current) =>
        current.some((item) => item.key === update.key) ? current : [...current, update],
      )
      setHasPollingError(false)
      setScreen(
        isSubscriptionCancelled(subscription)
          ? 'cancelled'
          : isProvisioningFailed(cluster)
            ? 'failed'
            : isWorkspaceReady(cluster, subscription)
              ? 'ready'
              : 'provisioning',
      )
    } catch (error) {
      if (error instanceof CloudApiError && error.status === 401) {
        redirectToAuth()
        return
      }
      setHasRetryError(true)
    } finally {
      setIsRetrying(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!workspace || isCancellingSubscription || isRetrying) return
    const startedReady = screen === 'ready'
    setIsCancellingSubscription(true)
    setHasCancelSubscriptionError(false)
    setHasCancelStatusError(false)

    const refreshWorkspace = async () => {
      const currentWorkspace = await refreshWorkspaceState(workspace, redirectToAuth)
      const { cluster, subscription } = currentWorkspace
      setWorkspace(currentWorkspace)
      setHasPollingError(false)
      setHasCancelStatusError(false)
      const update = observedUpdate(cluster, subscription)
      setUpdates((current) =>
        current.some((item) => item.key === update.key) ? current : [...current, update],
      )
      return currentWorkspace
    }

    let cancellationRequestSent = false
    try {
      const currentWorkspace = await refreshWorkspace()
      if (isSubscriptionCancelled(currentWorkspace.subscription)) {
        setIsCancelOutcomeUnknown(false)
        setScreen('cancelled')
        return
      }
      if (
        !isProvisioningFailed(currentWorkspace.cluster) &&
        !isProvisioningCancelled(currentWorkspace.cluster, currentWorkspace.subscription) &&
        !(startedReady && isWorkspaceReady(currentWorkspace.cluster, currentWorkspace.subscription))
      ) {
        setIsCancelOutcomeUnknown(false)
        setScreen(
          isWorkspaceReady(currentWorkspace.cluster, currentWorkspace.subscription)
            ? 'ready'
            : 'provisioning',
        )
        return
      }

      cancellationRequestSent = true
      const subscription = await cloudApi.cancelSubscription(
        workspace.organization.id,
        workspace.subscription.id,
      )
      if (!isSubscriptionCancelled(subscription)) {
        setIsCancelOutcomeUnknown(true)
        setHasCancelSubscriptionError(true)
        return
      }
      setIsCancelOutcomeUnknown(false)
      const nextWorkspace = { ...currentWorkspace, subscription }
      setWorkspace(nextWorkspace)
      const update = observedUpdate(workspace.cluster, subscription)
      setUpdates((current) =>
        current.some((item) => item.key === update.key) ? current : [...current, update],
      )
      setScreen('cancelled')
    } catch (error) {
      if (error instanceof CloudApiError && error.status === 401) {
        redirectToAuth()
        return
      }

      if (cancellationRequestSent) {
        try {
          const currentWorkspace = await refreshWorkspace()
          if (isSubscriptionCancelled(currentWorkspace.subscription)) {
            setIsCancelOutcomeUnknown(false)
            setScreen('cancelled')
          } else if (
            !isProvisioningFailed(currentWorkspace.cluster) &&
            !isProvisioningCancelled(currentWorkspace.cluster, currentWorkspace.subscription) &&
            !(
              startedReady &&
              isWorkspaceReady(currentWorkspace.cluster, currentWorkspace.subscription)
            )
          ) {
            setIsCancelOutcomeUnknown(false)
            setScreen(
              isWorkspaceReady(currentWorkspace.cluster, currentWorkspace.subscription)
                ? 'ready'
                : 'provisioning',
            )
          } else {
            setIsCancelOutcomeUnknown(true)
          }
        } catch (refreshError) {
          if (refreshError instanceof CloudApiError && refreshError.status === 401) {
            redirectToAuth()
            return
          }
          setIsCancelOutcomeUnknown(true)
        }
      }
      if (cancellationRequestSent) {
        setHasCancelSubscriptionError(true)
      } else {
        setHasCancelStatusError(true)
      }
    } finally {
      setIsCancellingSubscription(false)
    }
  }

  const accountName = user.displayName?.trim() || user.email

  return (
    <div
      className={`flex min-h-screen w-full flex-col justify-between font-sans transition-colors duration-200 ${darkMode ? 'dark bg-[#111215] text-[#f0f1f3]' : 'bg-[#fafafa] text-[#111827]'}`}
    >
      <header className="flex h-16 w-full items-center justify-between border-b border-black/[0.05] bg-transparent px-6 sm:px-12 dark:border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-neutral-900 text-xs font-bold text-white shadow-2xs dark:bg-white dark:text-neutral-900">
            <span className="font-mono text-[11px] leading-none">T</span>
          </div>
          <span className="text-sm font-semibold tracking-tight text-[#111827] dark:text-white">
            Tapstate
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden max-w-56 truncate text-xs text-neutral-500 sm:block dark:text-neutral-400">
            {accountName}
          </span>
          <button
            aria-label={t('app.toggleTheme')}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-black/[0.04] hover:text-neutral-900 dark:hover:bg-white/[0.05] dark:hover:text-white"
            onClick={() => setDarkMode(!darkMode)}
            title={t('app.toggleTheme')}
            type="button"
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <main className="flex w-full flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
        {screen === 'form' ? (
          <div className="mx-auto w-full max-w-[480px] space-y-8">
            <div className="space-y-2 text-center">
              <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-[#111827] sm:text-[32px] dark:text-white">
                {t('onboarding.title')}
              </h1>
              <p className="text-[14px] text-neutral-500 dark:text-neutral-400">
                {t('onboarding.description')}
              </p>
            </div>

            {hasSubmitError && (
              <div
                className="flex items-start gap-2 rounded-xl border border-red-200/80 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
                role="alert"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{t('onboarding.createError')}</span>
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label
                  className="block text-[13px] font-medium text-[#374151] dark:text-neutral-200"
                  htmlFor="onboarding-organization"
                >
                  {t('onboarding.organizationLabel')}
                </label>
                <input
                  autoComplete="organization"
                  className="h-10 w-full rounded-lg border border-black/[0.12] bg-white px-3.5 text-[14px] text-[#111827] shadow-2xs transition-all placeholder:text-neutral-400 focus:border-[#111827] focus:ring-1 focus:ring-[#111827] focus:outline-none dark:border-white/[0.14] dark:bg-[#1a1b1e] dark:text-white dark:focus:border-white dark:focus:ring-white"
                  id="onboarding-organization"
                  maxLength={100}
                  onChange={(event) => setOrganizationName(event.target.value)}
                  placeholder={t('onboarding.organizationPlaceholder')}
                  required
                  value={organizationName}
                />
                {organizationName && !organizationSlug && (
                  <p className="text-[11px] text-red-500">{t('onboarding.slugHint')}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[13px] font-medium text-[#374151] dark:text-neutral-200">
                    {t('onboarding.regionLabel')}
                  </label>
                  {isLoadingRegions && (
                    <span className="flex items-center gap-1 font-mono text-[11px] text-neutral-400">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      <span>{t('onboarding.loadingRegions')}</span>
                    </span>
                  )}
                </div>

                <div className="overflow-hidden rounded-xl border border-black/[0.12] bg-white shadow-2xs dark:border-white/[0.14] dark:bg-[#1a1b1e]">
                  <div className="flex border-b border-black/[0.08] bg-neutral-50/70 dark:border-white/[0.08] dark:bg-white/[0.02]">
                    <div className="flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-[12px] font-semibold text-[#111827] dark:text-white">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span>{t('onboarding.openRegions')}</span>
                    </div>
                  </div>

                  <div
                    aria-label={t('onboarding.regionLabel')}
                    className="divide-y divide-black/[0.06] dark:divide-white/[0.06]"
                    role="radiogroup"
                  >
                    {isLoadingRegions ? (
                      <div className="animate-pulse space-y-2.5 p-4" aria-hidden="true">
                        <div className="flex items-center justify-between">
                          <div className="h-4 w-48 rounded bg-neutral-200 dark:bg-neutral-800" />
                          <div className="h-4 w-4 rounded-full bg-neutral-200 dark:bg-neutral-800" />
                        </div>
                        <div className="h-3 w-28 rounded bg-neutral-100 dark:bg-neutral-800/60" />
                      </div>
                    ) : hasLoadError ? (
                      <div
                        className="flex items-center justify-between p-4 text-xs text-red-600 dark:text-red-400"
                        role="alert"
                      >
                        <span>{t('onboarding.regionError')}</span>
                        <button
                          className="ml-2 font-medium underline hover:text-red-800 dark:hover:text-red-300"
                          onClick={() => void loadRegions()}
                          type="button"
                        >
                          {t('onboarding.retry')}
                        </button>
                      </div>
                    ) : regions.length === 0 ? (
                      <div className="p-4 text-xs text-neutral-500 dark:text-neutral-400">
                        {t('onboarding.noRegions')}
                      </div>
                    ) : (
                      regions.map((region) => {
                        const isSelected = selectedRegionCode === region.code
                        return (
                          <button
                            aria-checked={isSelected}
                            className={`flex w-full items-center justify-between p-3.5 text-left transition-colors ${isSelected ? 'bg-neutral-100/70 dark:bg-white/[0.05]' : 'hover:bg-neutral-50 dark:hover:bg-white/[0.02]'}`}
                            key={region.code}
                            onClick={() => setSelectedRegionCode(region.code)}
                            role="radio"
                            type="button"
                          >
                            <span className="space-y-0.5">
                              <span className="flex items-center gap-2">
                                <span className="text-[13px] font-semibold text-[#111827] dark:text-white">
                                  {region.name}
                                </span>
                                <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                  {t('onboarding.available')}
                                </span>
                              </span>
                              <span className="block text-[11px] text-neutral-500 dark:text-neutral-400">
                                {region.code}
                              </span>
                            </span>
                            <span
                              className={`flex h-4 w-4 items-center justify-center rounded-full transition-all ${isSelected ? 'bg-[#111827] text-white dark:bg-white dark:text-[#111827]' : 'border border-neutral-300 dark:border-neutral-600'}`}
                              aria-hidden="true"
                            >
                              {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                            </span>
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-1.5 pt-1 text-[11.5px] leading-normal text-neutral-500 dark:text-neutral-400">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
                  <span>{t('onboarding.regionReadonly')}</span>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="block text-[13px] font-medium text-[#374151] dark:text-neutral-200">
                    {t('onboarding.clusterLabel')}
                  </label>
                  <span className="font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
                    {selectedRegion?.defaultSpecKey ?? t('onboarding.regionDefault')}
                  </span>
                </div>

                <div className="space-y-2.5 rounded-xl border border-black/[0.08] bg-white p-3.5 shadow-2xs dark:border-white/[0.1] dark:bg-[#1a1b1e]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[13px] font-semibold text-[#111827] dark:text-white">
                      {clusterName || t('onboarding.clusterPreviewEmpty')}
                    </span>
                    <span className="font-mono text-[11px] text-neutral-400">
                      {selectedRegion?.code}
                    </span>
                  </div>
                  <p className="m-0 text-[11.5px] text-neutral-500 dark:text-neutral-400">
                    {t('onboarding.clusterPendingNote')}
                  </p>
                </div>
              </div>

              <button
                className="mt-4 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#111827] text-[13.5px] font-medium text-white shadow-xs transition-all hover:bg-[#1f2937] active:scale-[0.99] disabled:opacity-50 dark:bg-white dark:text-[#111827] dark:hover:bg-neutral-100"
                disabled={
                  isLoadingRegions ||
                  hasLoadError ||
                  !selectedRegion ||
                  !organizationSlug ||
                  isSubmitting
                }
                type="submit"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>{t('onboarding.creating')}</span>
                  </>
                ) : (
                  <>
                    <span>{t('onboarding.createAction')}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="flex items-center justify-between border-t border-black/[0.05] pt-4 text-[11px] text-neutral-400 dark:border-white/[0.06]">
              <span>{t('onboarding.footnote')}</span>
              <span className="hidden sm:inline">{accountName}</span>
            </div>
          </div>
        ) : screen === 'starting' ? (
          <div className="mx-auto w-full max-w-[480px] space-y-7 text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 font-mono text-[11.5px] font-medium text-blue-600 dark:text-blue-400">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>{t('onboarding.startingBadge')}</span>
            </div>
            <div className="space-y-2">
              <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-[#111827] dark:text-white">
                {t('onboarding.progressTitle')}
              </h1>
              <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
                {t('onboarding.startingDescription', {
                  region: selectedRegion?.name,
                  organization: organizationName.trim(),
                })}
              </p>
            </div>
            <p className="font-mono text-[12px] text-neutral-500 dark:text-neutral-400">
              {t('onboarding.startingDetail')}
            </p>
          </div>
        ) : workspace ? (
          <ProvisioningView
            cluster={workspace.cluster}
            deploymentProgress={deploymentProgress}
            cancelOutcomeUnknown={isCancelOutcomeUnknown}
            entryError={entryError}
            hasPollingError={hasPollingError}
            cancelError={hasCancelSubscriptionError}
            cancelStatusError={hasCancelStatusError}
            isCancelling={isCancellingSubscription}
            isOpeningCluster={isOpeningCluster}
            isRetrying={isRetrying}
            mode={screen}
            onEdit={() => {
              if (workspace.cluster.state !== 'TERMINATED') return
              setHasSubmitError(false)
              setScreen('form')
            }}
            cleanupPending={screen === 'cancelled' && workspace.cluster.state !== 'TERMINATED'}
            cleanupStatusError={hasCleanupStatusError}
            onOpenCluster={() => onComplete(workspace.organization, workspace.cluster)}
            onCancel={() => void handleCancelSubscription()}
            onRetry={() => void handleRetry()}
            organization={workspace.organization}
            regionName={selectedRegion?.name ?? workspace.cluster.region}
            retryError={hasRetryError}
            subscription={workspace.subscription}
            updates={updates}
          />
        ) : null}
      </main>
    </div>
  )
}
