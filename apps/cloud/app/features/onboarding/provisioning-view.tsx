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

import type { Cluster, Organization, Subscription } from '../../service/cloud-api'

export interface ProvisioningUpdate {
  key: string
  observedAt: number
  clusterState: string
  resourceState: string | null
}

interface ProvisioningViewProps {
  mode: 'provisioning' | 'failed' | 'ready'
  organization: Organization
  cluster: Cluster
  subscription: Subscription
  regionName: string
  stage: number
  updates: ProvisioningUpdate[]
  hasPollingError: boolean
  isRetrying: boolean
  retryError: boolean
  isOpeningCluster: boolean
  entryError: string | null
  onRetry: () => void
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
  subscription,
  regionName,
  stage,
  updates,
  hasPollingError,
  isRetrying,
  retryError,
  isOpeningCluster,
  entryError,
  onRetry,
  onEdit,
  onOpenCluster,
}: ProvisioningViewProps) {
  const { t } = useTranslation()
  const [showUpdates, setShowUpdates] = useState(false)

  if (mode === 'provisioning') {
    const stages = [
      t('onboarding.stageAccepted'),
      t('onboarding.stageProvisioning'),
      t('onboarding.stageClusterReady'),
      t('onboarding.stageResourcesReady'),
    ]
    const currentStage = Math.min(stage, stages.length - 1)
    const detailKeys = [
      'onboarding.stageAcceptedDetail',
      'onboarding.stageProvisioningDetail',
      'onboarding.stageClusterReadyDetail',
      'onboarding.stageResourcesReadyDetail',
    ] as const

    return (
      <div className="mx-auto w-full max-w-[480px] space-y-7">
        <div className="space-y-2 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 font-mono text-[11.5px] font-medium text-blue-600 dark:text-blue-400">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            <span>{t('onboarding.progressBadge')}</span>
          </div>
          <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-[#111827] dark:text-white">
            {t('onboarding.progressTitle')}
          </h1>
          <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
            {t('onboarding.progressSubtitle', {
              region: regionName,
              organization: organization.name,
            })}
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between font-mono text-[12px] text-neutral-500 dark:text-neutral-400">
            <span>{t('onboarding.milestones')}</span>
            <span className="font-semibold text-[#111827] dark:text-white">
              {t('onboarding.stageCount', { current: currentStage + 1, total: stages.length })}
            </span>
          </div>
          <div
            aria-label={t('onboarding.milestones')}
            aria-valuemax={stages.length}
            aria-valuemin={0}
            aria-valuenow={currentStage + 1}
            aria-valuetext={t('onboarding.stageCount', {
              current: currentStage + 1,
              total: stages.length,
            })}
            className="h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]"
            role="progressbar"
          >
            <div
              className="h-full bg-neutral-900 transition-[width] duration-700 ease-out dark:bg-white"
              style={{ width: `${((currentStage + 1) / stages.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="space-y-3.5 py-1">
          {stages.map((label, index) => {
            const isDone = index < currentStage
            const isCurrent = index === currentStage
            return (
              <div
                className={`flex items-start gap-3.5 text-[13.5px] transition-opacity duration-300 ${
                  isDone
                    ? 'text-neutral-900 dark:text-white'
                    : isCurrent
                      ? 'font-medium text-[#111827] dark:text-white'
                      : 'text-neutral-400 opacity-60 dark:text-neutral-600'
                }`}
                key={label}
              >
                <div className="mt-0.5 shrink-0">
                  {isDone ? (
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </div>
                  ) : isCurrent ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent dark:border-white" />
                  ) : (
                    <div className="flex h-4 w-4 items-center justify-center rounded-full border border-neutral-300 font-mono text-[10px] text-neutral-400 dark:border-neutral-700">
                      {index + 1}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 leading-snug">{label}</div>
              </div>
            )
          })}
        </div>

        <div className="space-y-2 rounded-xl border border-black/[0.08] bg-white p-4 text-[12px] shadow-2xs dark:border-white/[0.1] dark:bg-[#1a1b1e]">
          <div>
            <span className="block text-[10.5px] font-semibold tracking-wider text-neutral-400 uppercase dark:text-neutral-500">
              {t('onboarding.currentStage')}
            </span>
            <p className="mt-0.5 font-mono text-[11.5px] leading-relaxed text-neutral-800 dark:text-neutral-200">
              {t(detailKeys[currentStage])}
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
          disabled={isOpeningCluster}
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
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[480px] space-y-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 shadow-xs dark:bg-red-950/40 dark:text-red-400">
        <AlertCircle className="h-6 w-6 stroke-[2]" />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-[24px] font-semibold tracking-[-0.03em] text-[#111827] dark:text-white">
          {t('onboarding.failedTitle')}
        </h1>
        <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
          {t('onboarding.failedDescription')}
        </p>
      </div>
      <div className="space-y-1.5 rounded-xl border border-red-200/80 bg-red-50/80 p-3.5 text-left text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
        <div className="flex items-center gap-1.5 font-semibold">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{t('onboarding.failedCodeLabel')}</span>
        </div>
        <p className="font-mono text-[11px] leading-relaxed text-red-600 dark:text-red-400">
          {cluster.provisionErrorCode ?? t('onboarding.failedCodeUnavailable')}
        </p>
      </div>
      <p className="text-left text-[12.5px] leading-relaxed text-neutral-500 dark:text-neutral-400">
        {t('onboarding.preservedSettings', { organization: organization.name })}
      </p>
      {retryError && (
        <p
          className="rounded-lg bg-red-50 p-3 text-left text-xs text-red-600 dark:bg-red-950/30 dark:text-red-400"
          role="alert"
        >
          {t('onboarding.retryError')}
        </p>
      )}
      <div className="space-y-2 pt-1">
        <button
          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#111827] text-[13px] font-medium text-white shadow-xs transition-colors hover:bg-[#1f2937] active:scale-[0.99] disabled:cursor-wait disabled:opacity-50 dark:bg-white dark:text-[#111827] dark:hover:bg-neutral-100"
          disabled={isRetrying}
          onClick={onRetry}
          type="button"
        >
          {isRetrying ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RotateCcw className="h-3.5 w-3.5" />
          )}
          <span>{isRetrying ? t('onboarding.retrying') : t('onboarding.retryProvisioning')}</span>
        </button>
        <button
          className="flex h-10 w-full items-center justify-center rounded-lg border border-black/[0.1] bg-white text-[13px] font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-white/[0.12] dark:bg-[#1a1b1e] dark:text-neutral-300 dark:hover:bg-[#202124]"
          onClick={onEdit}
          type="button"
        >
          {t('onboarding.editSettings')}
        </button>
      </div>
    </div>
  )
}
