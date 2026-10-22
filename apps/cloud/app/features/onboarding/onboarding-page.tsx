import { Button } from '@langgenius/dify-ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@langgenius/dify-ui/field'
import { Fieldset, FieldsetLegend } from '@langgenius/dify-ui/fieldset'
import { IconButton } from '@langgenius/dify-ui/icon-button'
import { Input } from '@langgenius/dify-ui/input'
import RadioCard from '@langgenius/dify-ui/radio-card'
import { RadioGroup } from '@langgenius/dify-ui/radio-group'
import { SkeletonRectangle } from '@langgenius/dify-ui/skeleton'
import { useNavigate } from '@tanstack/react-router'
import { AlertCircle, Check, CreditCard, MapPin, Moon, RefreshCw, Sun } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import type { UserProfile } from '../../types'
import type { OnboardingStart, OnboardingWorkspace } from './onboarding-service'
import type { OnboardingInput } from './onboarding-types'

import {
  CloudApiError,
  cloudApi,
  type Cluster,
  type DeploymentProgress,
  type Organization,
  type Region,
  type Spec,
  type Subscription,
} from '../../service/cloud-api'
import { formatPrice } from '../billing/billing-format'
import { navigateToCheckout } from '../billing/checkout-navigation'
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
  currentOrganization?: Organization | null
  initialWorkspace?: OnboardingWorkspace | null
  initialProgress?: DeploymentProgress | null
  suggestedClusterName?: string
  resumeError?: boolean
  onComplete: (organization: Organization, cluster: Cluster) => void
  onCreateWorkspace: (
    input: OnboardingInput,
    existingOrganization?: Organization | null,
    onOrganizationResolved?: (organization: Organization) => void,
  ) => Promise<OnboardingStart>
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

function workspaceScreen(workspace: OnboardingWorkspace): OnboardingScreen {
  if (isProvisioningCancelled(workspace.cluster, workspace.subscription)) return 'cancelled'
  if (isProvisioningFailed(workspace.cluster)) return 'failed'
  if (isWorkspaceReady(workspace.cluster, workspace.subscription)) return 'ready'
  return 'provisioning'
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
  currentOrganization = null,
  initialWorkspace = null,
  initialProgress = null,
  suggestedClusterName = '',
  resumeError = false,
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
  const [clusterNameInput, setClusterNameInput] = useState(suggestedClusterName)
  const [isLoadingRegions, setIsLoadingRegions] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasLoadError, setHasLoadError] = useState(false)
  const [hasSubmitError, setHasSubmitError] = useState(false)
  const [screen, setScreen] = useState<OnboardingScreen>(() =>
    initialWorkspace ? workspaceScreen(initialWorkspace) : 'form',
  )
  const [workspace, setWorkspace] = useState<OnboardingWorkspace | null>(initialWorkspace)
  const [updates, setUpdates] = useState<ProvisioningUpdate[]>(() =>
    initialWorkspace
      ? [observedUpdate(initialWorkspace.cluster, initialWorkspace.subscription)]
      : [],
  )
  const [deploymentProgress, setDeploymentProgress] = useState<DeploymentProgress | null>(
    initialProgress,
  )
  const [hasPollingError, setHasPollingError] = useState(false)
  const [hasCleanupStatusError, setHasCleanupStatusError] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const [hasRetryError, setHasRetryError] = useState(false)
  const [isCancellingSubscription, setIsCancellingSubscription] = useState(false)
  const [hasCancelSubscriptionError, setHasCancelSubscriptionError] = useState(false)
  const [hasCancelStatusError, setHasCancelStatusError] = useState(false)
  const [isCancelOutcomeUnknown, setIsCancelOutcomeUnknown] = useState(false)
  const [specs, setSpecs] = useState<Spec[]>([])
  const [selectedSpecKey, setSelectedSpecKey] = useState<string | null>(null)
  const [isLoadingSpecs, setIsLoadingSpecs] = useState(true)
  const [hasSpecsError, setHasSpecsError] = useState(false)
  const [consent, setConsent] = useState(false)
  const hasRedirectedToAuth = useRef(false)

  const redirectToAuth = () => {
    if (hasRedirectedToAuth.current) return
    hasRedirectedToAuth.current = true
    void navigate({ to: '/auth' })
  }

  const selectedRegion = useMemo(
    () => regions.find((region) => region.code === selectedRegionCode) ?? null,
    [regions, selectedRegionCode],
  )
  const selectedSpec = useMemo(
    () => specs.find((spec) => spec.key === selectedSpecKey) ?? null,
    [selectedSpecKey, specs],
  )
  const canManage =
    !currentOrganization?.ownerEmail ||
    currentOrganization.ownerEmail.toLowerCase() === user.email.toLowerCase()
  const organizationSlug = currentOrganization?.slug ?? toSlug(organizationName)
  const organizationDisplayName = currentOrganization?.name ?? organizationName.trim()
  const clusterName = currentOrganization
    ? toSlug(clusterNameInput).slice(0, 100)
    : organizationSlug
      ? `${organizationSlug}-stream`.slice(0, 100)
      : ''

  useEffect(() => {
    if (!currentOrganization || !suggestedClusterName) return
    setClusterNameInput(suggestedClusterName)
  }, [currentOrganization?.id, suggestedClusterName])

  useEffect(() => {
    if (!initialWorkspace) return
    setWorkspace(initialWorkspace)
    setDeploymentProgress(initialProgress)
    setUpdates([observedUpdate(initialWorkspace.cluster, initialWorkspace.subscription)])
    setScreen(workspaceScreen(initialWorkspace))
  }, [initialProgress, initialWorkspace])

  const loadRegions = async () => {
    setIsLoadingRegions(true)
    setHasLoadError(false)
    try {
      const availableRegions = (await cloudApi.regions()).filter((region) => region.open)
      setRegions(availableRegions)
      setSelectedRegionCode((current) =>
        availableRegions.some((region) => region.code === current)
          ? current
          : (availableRegions.find((region) => region.code === initialWorkspace?.cluster.region)
              ?.code ??
            availableRegions[0]?.code ??
            ''),
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

  const loadSpecs = async () => {
    setIsLoadingSpecs(true)
    setHasSpecsError(false)
    try {
      setSpecs(await cloudApi.specs())
    } catch {
      setHasSpecsError(true)
    } finally {
      setIsLoadingSpecs(false)
    }
  }

  useEffect(() => {
    void loadSpecs()
  }, [])

  useEffect(() => {
    if (specs.length === 0) return
    setSelectedSpecKey((current) => {
      if (current && specs.some((spec) => spec.key === current)) return current
      const regionDefault = selectedRegion?.defaultSpecKey
      return specs.find((spec) => spec.key === regionDefault)?.key ?? specs[0].key
    })
  }, [selectedRegion, specs])

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setHasSubmitError(false)
    if (
      !selectedRegion ||
      !organizationSlug ||
      !clusterName ||
      !selectedSpec ||
      !consent ||
      !canManage
    )
      return

    setIsSubmitting(true)
    let redirecting = false
    try {
      const result = await onCreateWorkspace(
        {
          organizationName: organizationDisplayName,
          organizationSlug,
          region: selectedRegion,
          clusterName,
          specKey: selectedSpec.key,
        },
        currentOrganization,
      )
      if ('checkoutUrl' in result) {
        redirecting = true
        navigateToCheckout(result.checkoutUrl)
        return
      }
      setWorkspace(result)
      setDeploymentProgress(null)
      setUpdates([observedUpdate(result.cluster, result.subscription)])
      setScreen(workspaceScreen(result))
      void navigate({
        to: '/onboarding',
        search: {
          organizationId: result.organization.id,
          subscriptionId: result.subscription.id,
        },
        replace: true,
      })
    } catch {
      setHasSubmitError(true)
      setScreen('form')
    } finally {
      if (!redirecting) setIsSubmitting(false)
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
        !isProvisioningCancelled(currentWorkspace.cluster, currentWorkspace.subscription)
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
            !isProvisioningCancelled(currentWorkspace.cluster, currentWorkspace.subscription)
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

  const resetOnboarding = () => {
    if (!workspace || workspace.cluster.state !== 'TERMINATED') return
    setHasSubmitError(false)
    setWorkspace(null)
    setDeploymentProgress(null)
    setUpdates([])
    setHasCancelSubscriptionError(false)
    setHasCancelStatusError(false)
    setIsCancelOutcomeUnknown(false)
    setScreen('form')
    setClusterNameInput(suggestedClusterName)
    void navigate({
      to: '/onboarding',
      search: { organizationId: workspace.organization.id, subscriptionId: undefined },
      replace: true,
    })
  }

  const accountName = user.displayName?.trim() || user.email

  return (
    <div
      className={`flex min-h-screen w-full flex-col justify-between font-sans transition-colors duration-200 ${darkMode ? 'dark bg-[#111215] text-[#f0f1f3]' : 'bg-[#fafafa] text-[#111827]'}`}
    >
      <header className="flex h-16 w-full items-center justify-between border-b border-black/[0.05] bg-transparent px-6 sm:px-12 dark:border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900 dark:bg-white">
            <img alt="" className="h-5 w-5 dark:hidden" src="/tapstate-mark-light.svg" />
            <img alt="" className="hidden h-5 w-5 dark:block" src="/tapstate-mark.svg" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-[#111827] dark:text-white">
            Tapstate
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden max-w-56 truncate text-xs text-neutral-500 sm:block dark:text-neutral-400">
            {accountName}
          </span>
          <IconButton
            aria-label={t('app.toggleTheme')}
            onClick={() => setDarkMode(!darkMode)}
            size="md"
            title={t('app.toggleTheme')}
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </IconButton>
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
                {t(
                  currentOrganization
                    ? 'onboarding.existingOrganizationDescription'
                    : 'onboarding.description',
                )}
              </p>
            </div>

            {hasSubmitError && (
              <div
                className="system-xs-regular text-text-destructive border-components-input-border-destructive bg-components-input-bg-destructive mb-4 flex items-start gap-2 rounded-lg border p-3"
                role="alert"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{t('onboarding.checkoutError')}</span>
              </div>
            )}

            {resumeError && (
              <div className="body-xs-regular text-text-warning-secondary" role="status">
                {t('onboarding.resumeError')}
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              {currentOrganization ? (
                <>
                  <Field name="organization">
                    <FieldLabel>{t('onboarding.organizationLabel')}</FieldLabel>
                    <Input disabled value={currentOrganization.name} />
                  </Field>
                  <Field name="clusterName" invalid={Boolean(clusterNameInput && !clusterName)}>
                    <FieldLabel>{t('onboarding.newClusterLabel')}</FieldLabel>
                    <Input
                      autoComplete="off"
                      maxLength={100}
                      onValueChange={setClusterNameInput}
                      placeholder={t('onboarding.clusterNamePlaceholder')}
                      required
                      value={clusterNameInput}
                    />
                    <FieldError>{t('onboarding.clusterNameHint')}</FieldError>
                  </Field>
                </>
              ) : (
                <Field
                  name="organizationName"
                  invalid={Boolean(organizationName && !organizationSlug)}
                >
                  <FieldLabel>{t('onboarding.organizationLabel')}</FieldLabel>
                  <Input
                    autoComplete="organization"
                    maxLength={100}
                    onValueChange={setOrganizationName}
                    placeholder={t('onboarding.organizationPlaceholder')}
                    required
                    value={organizationName}
                  />
                  <FieldError>{t('onboarding.slugHint')}</FieldError>
                </Field>
              )}

              <Field aria-busy={isLoadingRegions} className="grid gap-2" name="region">
                <Fieldset className="grid gap-2">
                  <FieldsetLegend className="mb-0 flex items-center justify-between py-0">
                    <span>{t('onboarding.regionLabel')}</span>
                    {isLoadingRegions && (
                      <span className="system-xs-regular text-text-tertiary flex items-center gap-1">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        <span>{t('onboarding.loadingRegions')}</span>
                      </span>
                    )}
                  </FieldsetLegend>

                  {isLoadingRegions ? (
                    <div
                      className="border-components-panel-border bg-components-panel-bg space-y-2 rounded-xl border-[0.5px] p-3"
                      aria-hidden="true"
                    >
                      <SkeletonRectangle className="h-4 w-48" />
                      <SkeletonRectangle className="h-3 w-28" />
                    </div>
                  ) : hasLoadError ? (
                    <div className="flex items-center justify-between gap-3" role="alert">
                      <span className="body-xs-regular text-text-destructive">
                        {t('onboarding.regionError')}
                      </span>
                      <Button onClick={() => void loadRegions()} size="small" variant="tertiary">
                        {t('onboarding.retry')}
                      </Button>
                    </div>
                  ) : regions.length === 0 ? (
                    <FieldDescription>{t('onboarding.noRegions')}</FieldDescription>
                  ) : (
                    <RadioGroup<string>
                      aria-label={t('onboarding.regionLabel')}
                      className="grid gap-2"
                      onValueChange={setSelectedRegionCode}
                      value={selectedRegionCode}
                    >
                      {regions.map((region) => (
                        <RadioCard
                          description={region.code}
                          icon={<MapPin aria-hidden="true" className="text-text-accent size-4" />}
                          key={region.code}
                          title={region.name}
                          value={region.code}
                        />
                      ))}
                    </RadioGroup>
                  )}
                </Fieldset>

                <FieldDescription className="flex items-start gap-1.5">
                  <AlertCircle className="text-text-tertiary mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{t('onboarding.regionReadonly')}</span>
                </FieldDescription>
              </Field>

              <section aria-labelledby="onboarding-plan-selection" className="grid gap-2 pt-1">
                <div className="flex items-center justify-between">
                  <h2
                    className="system-sm-medium text-text-secondary m-0"
                    id="onboarding-plan-selection"
                  >
                    {t('onboarding.planLabel')}
                  </h2>
                  {isLoadingSpecs && (
                    <span className="flex items-center gap-1 font-mono text-[11px] text-neutral-400">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      <span>{t('onboarding.loadingPlans')}</span>
                    </span>
                  )}
                </div>

                {hasSpecsError ? (
                  <div
                    className="flex items-center justify-between gap-3 rounded-xl border border-red-200/80 bg-red-50 p-3.5 text-xs text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
                    role="alert"
                  >
                    <span>{t('onboarding.plansError')}</span>
                    <button
                      className="font-medium underline hover:text-red-800 dark:hover:text-red-300"
                      onClick={() => void loadSpecs()}
                      type="button"
                    >
                      {t('onboarding.retry')}
                    </button>
                  </div>
                ) : isLoadingSpecs ? (
                  <div
                    className="animate-pulse rounded-xl border border-black/[0.08] bg-white p-4 dark:border-white/[0.1] dark:bg-[#1a1b1e]"
                    aria-hidden="true"
                  >
                    <div className="h-4 w-40 rounded bg-neutral-200 dark:bg-neutral-800" />
                    <div className="mt-2 h-3 w-56 rounded bg-neutral-100 dark:bg-neutral-800/60" />
                  </div>
                ) : specs.length === 0 ? (
                  <div className="rounded-xl border border-black/[0.08] p-4 text-xs text-neutral-500 dark:border-white/[0.1] dark:text-neutral-400">
                    {t('onboarding.noPlans')}
                  </div>
                ) : (
                  <div
                    aria-label={t('onboarding.planLabel')}
                    className="divide-y divide-black/[0.06] overflow-hidden rounded-xl border border-black/[0.12] bg-white shadow-2xs dark:divide-white/[0.06] dark:border-white/[0.14] dark:bg-[#1a1b1e]"
                    role="radiogroup"
                  >
                    {specs.map((spec) => {
                      const isSelected = spec.key === selectedSpecKey
                      const hasTrial = spec.trialDays > 0
                      return (
                        <button
                          aria-checked={isSelected}
                          className={`flex w-full items-center justify-between gap-3 p-3.5 text-left transition-colors disabled:cursor-not-allowed ${isSelected ? 'bg-neutral-100/70 dark:bg-white/[0.05]' : 'hover:bg-neutral-50 dark:hover:bg-white/[0.02]'}`}
                          disabled={!canManage}
                          key={spec.key}
                          onClick={() => {
                            setSelectedSpecKey(spec.key)
                            setHasSubmitError(false)
                          }}
                          role="radio"
                          type="button"
                        >
                          <span className="min-w-0 space-y-0.5">
                            <span className="block truncate text-[13px] font-semibold text-[#111827] dark:text-white">
                              {spec.displayName}
                            </span>
                            <span className="block text-[11px] text-neutral-500 dark:text-neutral-400">
                              {t('billing.specLine', {
                                cpu: spec.cpuCores,
                                memory: spec.memoryGb,
                                storage: spec.mdbSizeGb,
                              })}
                            </span>
                            <span
                              className={`mt-1 inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                hasTrial
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                  : 'bg-black/[0.05] text-neutral-600 dark:bg-white/[0.08] dark:text-neutral-300'
                              }`}
                            >
                              {hasTrial
                                ? t('billing.trialBadge', { count: spec.trialDays })
                                : t('billing.noTrial')}
                            </span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span className="block text-[13px] font-semibold text-[#111827] dark:text-white">
                              {formatPrice(spec.unitPriceCents, spec.currency)}
                            </span>
                            <span className="block text-[10px] text-neutral-500 dark:text-neutral-400">
                              {t('billing.perMonth')}
                            </span>
                          </span>
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-all ${isSelected ? 'bg-[#111827] text-white dark:bg-white dark:text-[#111827]' : 'border border-neutral-300 dark:border-neutral-600'}`}
                            aria-hidden="true"
                          >
                            {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}

                <p className="text-[11px] leading-normal text-neutral-500 dark:text-neutral-400">
                  {t('onboarding.planHint')}
                </p>
              </section>

              {canManage ? (
                <label className="flex cursor-pointer items-start gap-2.5 text-[12.5px] leading-relaxed text-neutral-700 dark:text-neutral-300">
                  <input
                    checked={consent}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-black/[0.2] accent-neutral-900 dark:accent-white"
                    disabled={isSubmitting}
                    onChange={(event) => setConsent(event.target.checked)}
                    type="checkbox"
                  />
                  <span>{t('billing.consent')}</span>
                </label>
              ) : (
                <p
                  className="rounded-xl border border-black/[0.06] p-3.5 text-xs text-neutral-500 dark:border-white/[0.06] dark:text-neutral-400"
                  role="status"
                >
                  {t('billing.ownerOnly')}
                </p>
              )}

              <section aria-labelledby="onboarding-cluster-summary" className="grid gap-2 pt-1">
                <div className="flex items-center justify-between">
                  <h2
                    className="system-sm-medium text-text-secondary m-0"
                    id="onboarding-cluster-summary"
                  >
                    {t(
                      currentOrganization
                        ? 'onboarding.newClusterLabel'
                        : 'onboarding.clusterLabel',
                    )}
                  </h2>
                  <span className="system-xs-regular text-text-tertiary">
                    {selectedSpec?.key ?? t('onboarding.regionDefault')}
                  </span>
                </div>

                <div className="border-components-panel-border bg-components-panel-bg shadow-shadow-shadow-3 space-y-2.5 rounded-xl border-[0.5px] p-3.5 shadow-xs">
                  <div className="flex items-center justify-between gap-3">
                    <span className="system-sm-semibold text-text-primary">
                      {clusterName || t('onboarding.clusterPreviewEmpty')}
                    </span>
                    <span className="system-xs-regular text-text-tertiary">
                      {selectedRegion?.code}
                    </span>
                  </div>
                  <p className="body-xs-regular text-text-tertiary m-0">
                    {t('onboarding.clusterPendingNote')}
                  </p>
                </div>
              </section>

              <Button
                aria-labelledby="onboarding-submit-label"
                className="mt-4 w-full"
                disabled={
                  isLoadingRegions ||
                  isLoadingSpecs ||
                  hasLoadError ||
                  hasSpecsError ||
                  !selectedRegion ||
                  !organizationSlug ||
                  !clusterName ||
                  !selectedSpec ||
                  !consent ||
                  !canManage ||
                  isSubmitting
                }
                loading={isSubmitting}
                size="large"
                type="submit"
                variant="primary"
              >
                {isSubmitting ? (
                  <span id="onboarding-submit-label">{t('onboarding.startingCheckout')}</span>
                ) : (
                  <span id="onboarding-submit-label" className="inline-flex items-center gap-2">
                    {t('onboarding.continueToPayment')}
                    <CreditCard className="size-4" />
                  </span>
                )}
              </Button>
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
                  organization: organizationDisplayName,
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
            onEdit={resetOnboarding}
            cleanupPending={screen === 'cancelled' && workspace.cluster.state !== 'TERMINATED'}
            cleanupStatusError={hasCleanupStatusError}
            onOpenCluster={() => onComplete(workspace.organization, workspace.cluster)}
            onViewSubscriptions={() =>
              void navigate({
                to: '/billing',
                search: { organizationId: workspace.organization.id },
              })
            }
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
