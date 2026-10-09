import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  RotateCcw,
  Terminal,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type {
  Cluster,
  DeploymentProgress,
  Organization,
  Subscription,
} from '../../service/cloud-api'

export interface ProvisioningUpdate {
  key: string
  observedAt: number
  clusterState: string
  resourceState: string | null
}

interface ProvisioningViewProps {
  mode: 'provisioning' | 'failed' | 'ready' | 'cancelled'
  organization: Organization
  cluster: Cluster
  deploymentProgress: DeploymentProgress | null
  subscription: Subscription
  regionName: string
  updates: ProvisioningUpdate[]
  hasPollingError: boolean
  isRetrying: boolean
  retryError: boolean
  isCancelling: boolean
  cancelError: boolean
  cancelStatusError: boolean
  cancelOutcomeUnknown: boolean
  cleanupPending: boolean
  cleanupStatusError: boolean
  isOpeningCluster: boolean
  entryError: string | null
  onRetry: () => void
  onCancel: () => void
  onEdit: () => void
  onOpenCluster: () => void
}

function timeLabel(value: number) {
  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function ProvisioningView({
  mode,
  organization,
  cluster,
  deploymentProgress,
  subscription,
  regionName,
  updates,
  hasPollingError,
  isRetrying,
  retryError,
  isCancelling,
  cancelError,
  cancelStatusError,
  cancelOutcomeUnknown,
  cleanupPending,
  cleanupStatusError,
  isOpeningCluster,
  entryError,
  onRetry,
  onCancel,
  onEdit,
  onOpenCluster,
}: ProvisioningViewProps) {
  const { t } = useTranslation()
  const [showUpdates, setShowUpdates] = useState(false)
  const [confirmReadyCancellation, setConfirmReadyCancellation] = useState(false)
  const cancelErrorAlert = cancelError ? (
    <p
      className="rounded-lg bg-red-50 p-3 text-left text-xs text-red-600 dark:bg-red-950/30 dark:text-red-400"
      role="alert"
    >
      {t('onboarding.cancelSubscriptionError')}
    </p>
  ) : null

  if (mode === 'provisioning' || mode === 'failed') {
    const failed = mode === 'failed'
    const stages = deploymentProgress?.operations ?? []
    const failedStage = stages.findIndex((item) => item.status === 'FAILED')
    const failedOperation = failedStage >= 0 ? stages[failedStage] : null
    const runningStage =
      failed && failedStage >= 0
        ? failedStage
        : stages.findIndex((item) => ['RUNNING', 'RETRYING', 'FAILED'].includes(item.status))
    const currentStage =
      runningStage >= 0
        ? runningStage
        : stages.findIndex((item) => !['SUCCEEDED', 'SKIPPED'].includes(item.status))
    const activeStage = currentStage < 0 ? stages.length - 1 : currentStage
    const percent = Math.max(0, Math.min(100, deploymentProgress?.percent ?? 0))

    return (
      <div className="mx-auto w-full max-w-[480px] space-y-7">
        <div className="space-y-2 text-center">
          <div
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[11.5px] font-medium ${
              failed
                ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
            }`}
          >
            {failed ? (
              <AlertCircle className="h-3.5 w-3.5" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            )}
            <span>{t(failed ? 'onboarding.failedBadge' : 'onboarding.progressBadge')}</span>
          </div>
          <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-[#111827] dark:text-white">
            {t(failed ? 'onboarding.failedTitle' : 'onboarding.progressTitle')}
          </h1>
          <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
            {failed
              ? t('onboarding.failedDescription')
              : t('onboarding.progressSubtitle', {
                  region: regionName,
                  organization: organization.name,
                })}
          </p>
        </div>

        {cancelErrorAlert}

        {failed && (
          <div className="space-y-1.5 rounded-xl border border-red-200/80 bg-red-50/80 p-3.5 text-left text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            <div className="flex items-center gap-1.5 font-semibold">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{t('onboarding.failedCodeLabel')}</span>
            </div>
            <p className="font-mono text-[11px] leading-relaxed text-red-600 dark:text-red-400">
              {cluster.provisionErrorCode ?? t('onboarding.failedCodeUnavailable')}
            </p>
            <div className="mt-3 border-t border-red-200/80 pt-3 dark:border-red-900/50">
              <span className="font-semibold">{t('onboarding.failedStage')}</span>
              <p className="mt-1 font-medium">
                {failedOperation?.displayName ?? t('onboarding.loadingProgress')}
              </p>
              <p className="mt-1 font-mono text-[11px] leading-relaxed break-words text-red-600 dark:text-red-400">
                {failedOperation?.message ??
                  deploymentProgress?.message ??
                  t('onboarding.loadingProgress')}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between font-mono text-[12px] text-neutral-500 dark:text-neutral-400">
            <span>{t('onboarding.milestones')}</span>
            <span className="font-semibold text-[#111827] dark:text-white">
              {deploymentProgress ? `${percent}%` : t('onboarding.loadingProgress')}
            </span>
          </div>
          <div
            aria-label={t('onboarding.milestones')}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={percent}
            aria-valuetext={`${percent}%`}
            className="h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]"
            role="progressbar"
          >
            <div
              className="h-full bg-neutral-900 transition-[width] duration-700 ease-out dark:bg-white"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        <div className="max-h-56 space-y-3.5 overflow-y-auto py-1">
          {stages.map((operation, index) => {
            const isDone = ['SUCCEEDED', 'SKIPPED'].includes(operation.status)
            const isCurrent = index === activeStage && !isDone
            return (
              <div
                className={`flex items-start gap-3.5 text-[13.5px] transition-opacity duration-300 ${
                  isDone
                    ? 'text-neutral-900 dark:text-white'
                    : operation.status === 'FAILED'
                      ? 'font-medium text-red-600 dark:text-red-400'
                      : isCurrent
                        ? 'font-medium text-[#111827] dark:text-white'
                        : 'text-neutral-400 opacity-60 dark:text-neutral-600'
                }`}
                key={operation.operation}
              >
                <div className="mt-0.5 shrink-0">
                  {isDone ? (
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </div>
                  ) : operation.status === 'FAILED' ? (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  ) : isCurrent && !failed ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent dark:border-white" />
                  ) : (
                    <div className="flex h-4 w-4 items-center justify-center rounded-full border border-neutral-300 font-mono text-[10px] text-neutral-400 dark:border-neutral-700">
                      {index + 1}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 leading-snug">
                  <div>{operation.displayName}</div>
                  {operation.status === 'FAILED' && operation.message && (
                    <p className="mt-1 font-mono text-[11px] font-normal break-words text-red-600 dark:text-red-400">
                      {operation.message}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {!failed && (
          <div className="space-y-2 rounded-xl border border-black/[0.08] bg-white p-4 text-[12px] shadow-2xs dark:border-white/[0.1] dark:bg-[#1a1b1e]">
            <div>
              <span className="block text-[10.5px] font-semibold tracking-wider text-neutral-400 uppercase dark:text-neutral-500">
                {t('onboarding.currentStage')}
              </span>
              <p className="mt-0.5 font-mono text-[11.5px] leading-relaxed text-neutral-800 dark:text-neutral-200">
                {stages[activeStage]?.message ??
                  stages[activeStage]?.displayName ??
                  t('onboarding.loadingProgress')}
              </p>
            </div>
            <div className="border-t border-black/[0.05] pt-2 dark:border-white/[0.06]">
              <span className="block text-[10.5px] font-semibold tracking-wider text-neutral-400 uppercase dark:text-neutral-500">
                {t('onboarding.nextUpdate')}
              </span>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-neutral-600 dark:text-neutral-300">
                {t('onboarding.nextUpdateDetail')}
              </p>
            </div>
          </div>
        )}

        {hasPollingError && (
          <div
            className="flex items-start gap-2 rounded-xl border border-amber-200/80 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300"
            role="status"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t('onboarding.pollError')}</span>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-black/[0.08] shadow-2xs dark:border-white/[0.1]">
          <button
            className="flex w-full items-center justify-between bg-neutral-50 px-3.5 py-2.5 font-mono text-[11px] text-neutral-500 transition-colors hover:text-neutral-900 dark:bg-[#18191c] dark:hover:text-white"
            onClick={() => setShowUpdates((value) => !value)}
            type="button"
          >
            <span className="flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5" />
              <span>{t('onboarding.statusUpdates', { count: updates.length })}</span>
            </span>
            {showUpdates ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {showUpdates && (
            <div className="max-h-36 space-y-1 overflow-y-auto bg-neutral-950 p-3.5 font-mono text-[11px] text-neutral-300 select-text">
              {updates.map((update) => (
                <div className="leading-tight" key={update.key}>
                  {t('onboarding.statusUpdateLine', {
                    time: timeLabel(update.observedAt),
                    cluster: update.clusterState,
                    resources: update.resourceState ?? t('onboarding.statusNotReported'),
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
        {failed && (
          <div className="space-y-3 text-left">
            <p className="text-[12.5px] leading-relaxed text-neutral-500 dark:text-neutral-400">
              {t('onboarding.preservedSettings', { organization: organization.name })}
            </p>
            {retryError && (
              <p
                className="rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/30 dark:text-red-400"
                role="alert"
              >
                {t('onboarding.retryError')}
              </p>
            )}
            {cancelStatusError && (
              <p
                className="rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/30 dark:text-red-400"
                role="alert"
              >
                {t('onboarding.cancelStatusError')}
              </p>
            )}
            <div className="space-y-2 pt-1">
              <button
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#111827] text-[13px] font-medium text-white shadow-xs transition-colors hover:bg-[#1f2937] active:scale-[0.99] disabled:cursor-wait disabled:opacity-50 dark:bg-white dark:text-[#111827] dark:hover:bg-neutral-100"
                disabled={isRetrying || isCancelling || cancelOutcomeUnknown}
                onClick={onRetry}
                type="button"
              >
                {isRetrying ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
                <span>
                  {isRetrying ? t('onboarding.retrying') : t('onboarding.retryProvisioning')}
                </span>
              </button>
              <button
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-black/[0.1] bg-white text-[13px] font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-wait disabled:opacity-50 dark:border-white/[0.12] dark:bg-[#1a1b1e] dark:text-neutral-300 dark:hover:bg-[#202124]"
                disabled={isRetrying || isCancelling}
                onClick={onCancel}
                type="button"
              >
                {isCancelling && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                {isCancelling
                  ? t('onboarding.cancellingSubscription')
                  : t('onboarding.cancelSubscription')}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (mode === 'ready') {
    return (
      <div className="mx-auto w-full max-w-[480px] space-y-7 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shadow-xs dark:bg-emerald-950/40 dark:text-emerald-400">
          <Check className="h-6 w-6 stroke-[2.5]" />
        </div>
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-0.5 font-mono text-[11.5px] font-medium text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            <span>{t('onboarding.readyBadge')}</span>
          </div>
          <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-[#111827] dark:text-white">
            {t('onboarding.readyTitle')}
          </h1>
          <p className="text-[13.5px] text-neutral-500 dark:text-neutral-400">
            {t('onboarding.readyDescription', { organization: organization.name })}
          </p>
        </div>

        <div className="space-y-2 rounded-xl border border-black/[0.08] bg-white p-4 text-left text-[12px] shadow-2xs dark:border-white/[0.1] dark:bg-[#1a1b1e]">
          <div className="flex items-center justify-between gap-4">
            <span className="text-neutral-400">{t('onboarding.clusterNameLabel')}</span>
            <span className="font-semibold text-[#111827] dark:text-white">{cluster.name}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-neutral-400">{t('onboarding.regionLabel')}</span>
            <span className="font-medium text-[#111827] dark:text-white">{regionName}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-neutral-400">{t('onboarding.clusterIdLabel')}</span>
            <span className="font-mono text-[#111827] select-all dark:text-white">
              {cluster.id}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-neutral-400">{t('onboarding.resourceStateLabel')}</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400">
              {subscription.resourceState}
            </span>
          </div>
        </div>

        {cancelErrorAlert}
        {cancelStatusError && (
          <p
            className="rounded-lg bg-red-50 p-3 text-left text-xs text-red-600 dark:bg-red-950/30 dark:text-red-400"
            role="alert"
          >
            {t('onboarding.cancelStatusError')}
          </p>
        )}

        {entryError && (
          <div
            className="rounded-xl border border-red-200/80 bg-red-50 p-3 text-left text-xs text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
            role="alert"
          >
            {entryError}
          </div>
        )}
        <button
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#111827] text-[13.5px] font-semibold text-white shadow-xs transition-colors hover:bg-[#1f2937] active:scale-[0.99] disabled:cursor-wait disabled:opacity-50 dark:bg-white dark:text-[#111827] dark:hover:bg-neutral-100"
          disabled={isOpeningCluster || isCancelling || cancelOutcomeUnknown}
          onClick={onOpenCluster}
          type="button"
        >
          <span>
            {isOpeningCluster ? t('onboarding.openingCluster') : t('onboarding.openCluster')}
          </span>
          {isOpeningCluster ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
        </button>
        {confirmReadyCancellation ? (
          <div className="space-y-3 rounded-xl border border-red-200/80 bg-red-50/80 p-4 text-left dark:border-red-900/50 dark:bg-red-950/30">
            <p className="text-[12.5px] leading-relaxed text-red-700 dark:text-red-300">
              {t('onboarding.readyCancelWarning', { cluster: cluster.name })}
            </p>
            <div className="flex gap-2">
              <button
                className="flex h-10 flex-1 items-center justify-center rounded-lg border border-black/[0.1] bg-white text-[13px] font-medium text-neutral-700 dark:border-white/[0.12] dark:bg-[#1a1b1e] dark:text-neutral-300"
                disabled={isCancelling}
                onClick={() => setConfirmReadyCancellation(false)}
                type="button"
              >
                {t('onboarding.keepSubscription')}
              </button>
              <button
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 text-[13px] font-medium text-white hover:bg-red-700 disabled:cursor-wait disabled:opacity-50"
                disabled={isCancelling}
                onClick={onCancel}
                type="button"
              >
                {isCancelling && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                {isCancelling
                  ? t('onboarding.cancellingSubscription')
                  : t('onboarding.confirmCancelSubscription')}
              </button>
            </div>
          </div>
        ) : (
          <button
            className="flex h-10 w-full items-center justify-center rounded-lg border border-black/[0.1] bg-white text-[13px] font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-white/[0.12] dark:bg-[#1a1b1e] dark:text-neutral-300 dark:hover:bg-[#202124]"
            onClick={() => setConfirmReadyCancellation(true)}
            type="button"
          >
            {t('onboarding.cancelSubscription')}
          </button>
        )}
      </div>
    )
  }

  if (mode === 'cancelled') {
    return (
      <div className="mx-auto w-full max-w-[480px] space-y-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 shadow-xs dark:bg-neutral-800 dark:text-neutral-300">
          <AlertCircle className="h-6 w-6 stroke-[2]" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-[24px] font-semibold tracking-[-0.03em] text-[#111827] dark:text-white">
            {t('onboarding.cancelledTitle')}
          </h1>
          <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
            {t(cleanupPending ? 'onboarding.cleanupPending' : 'onboarding.cancelledDescription')}
          </p>
        </div>
        {cleanupStatusError && (
          <p className="text-xs text-red-600 dark:text-red-400" role="alert">
            {t('onboarding.cleanupStatusError')}
          </p>
        )}
        <button
          className="flex h-10 w-full items-center justify-center rounded-lg border border-black/[0.1] bg-white text-[13px] font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.12] dark:bg-[#1a1b1e] dark:text-neutral-300 dark:hover:bg-[#202124]"
          disabled={cleanupPending}
          onClick={onEdit}
          type="button"
        >
          {t(cleanupPending ? 'onboarding.cleanupWaiting' : 'onboarding.backToSetup')}
        </button>
      </div>
    )
  }

  return null
}
