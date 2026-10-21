import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { storageRequest, type RecoveryPlan } from '@/service/storage-client'

import { useStorage } from './storage-context'
import { inputClass, StorageError } from './storage-ui'
import { useStorageAction } from './use-storage-action'

export function StorageRecovery() {
  const { t } = useTranslation()
  const { fetcher, snapshot, refresh } = useStorage()
  const action = useStorageAction()
  const [scope, setScope] = useState<'CLUSTER' | 'PIPELINE'>('CLUSTER')
  const [pipelineIds, setPipelineIds] = useState('')
  const [previousOperationId, setPreviousOperationId] = useState('')
  const [operationId, setOperationId] = useState(snapshot?.operationId ?? '')
  const [plan, setPlan] = useState<RecoveryPlan | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const canPlan = snapshot?.allowedActions.includes('storage.recovery.plan')
  const clearPlan = () => {
    setPlan(null)
    setConfirmed(false)
    action.reset()
  }
  return (
    <section className="border-border space-y-4 rounded-lg border p-4">
      <h2 className="text-base font-semibold">{t('storage.recovery.title')}</h2>
      <p className="text-muted-foreground text-sm">{t('storage.recovery.help')}</p>
      {canPlan && (
        <fieldset disabled={action.busy} className="space-y-3">
          <div className="block space-y-1 text-sm">
            <span>{t('storage.recovery.scope')}</span>
            <span className="flex gap-4">
              {(['CLUSTER', 'PIPELINE'] as const).map((value) => (
                <label key={value} className="flex min-h-11 items-center gap-2">
                  <input
                    type="radio"
                    name="recovery-scope"
                    checked={scope === value}
                    onChange={() => {
                      setScope(value)
                      clearPlan()
                    }}
                  />
                  {t(
                    value === 'CLUSTER' ? 'storage.recovery.cluster' : 'storage.recovery.pipelines',
                  )}
                </label>
              ))}
            </span>
          </div>
          {scope === 'PIPELINE' && (
            <label className="block space-y-1 text-sm">
              <span>{t('storage.resourceIds')}</span>
              <input
                className={inputClass}
                value={pipelineIds}
                onChange={(e) => {
                  setPipelineIds(e.target.value)
                  clearPlan()
                }}
              />
            </label>
          )}
          <label className="block space-y-1 text-sm">
            <span>{t('storage.recovery.previous')}</span>
            <input
              className={inputClass}
              value={previousOperationId}
              onChange={(e) => {
                setPreviousOperationId(e.target.value)
                clearPlan()
              }}
            />
          </label>
          <Button
            className="min-h-11 sm:min-h-8"
            type="button"
            variant="outline"
            disabled={scope === 'PIPELINE' && splitIds(pipelineIds).length !== 1}
            onClick={() => {
              clearPlan()
              void action.run(
                () =>
                  storageRequest<RecoveryPlan>(fetcher, 'storage.recovery.plan', {
                    scope,
                    pipelineIds: scope === 'CLUSTER' ? [] : splitIds(pipelineIds),
                    ...(previousOperationId.trim()
                      ? { previousOperationId: previousOperationId.trim() }
                      : {}),
                  }),
                (result) => {
                  setPlan(result)
                  setOperationId(result.operationId)
                },
              )
            }}
          >
            {t('storage.recovery.preview')}
          </Button>
        </fieldset>
      )}
      {plan && (
        <div className="space-y-3" aria-live="polite">
          <p className="text-sm">{t('storage.recovery.affected')}</p>
          <ul className="list-inside list-disc text-sm">
            {(plan.affectedPipelineIds ?? []).map((id) => (
              <li key={id}>{id}</li>
            ))}
          </ul>
          {(plan.affectedPipelineIds ?? []).length === 0 && (
            <p className="text-muted-foreground text-sm">{t('storage.recovery.noPipelines')}</p>
          )}
          <p className="text-sm">
            {t('storage.operationStatus', {
              phase: t(`storage.operationPhase.${plan.phase}`, {
                defaultValue: t('storage.operationPhase.UNKNOWN'),
              }),
            })}
          </p>
          {plan.executionErrorCode && (
            <div
              role="alert"
              className="border-destructive/30 bg-destructive/5 rounded-md border p-3 text-sm"
            >
              <p>{t('storage.recovery.executionFailed')}</p>
              <code className="mt-1 block text-xs">{plan.executionErrorCode}</code>
            </div>
          )}
          {plan.scope === 'PIPELINE' && (plan.targetPolicies ?? []).length > 0 && (
            <div className="space-y-2 text-sm">
              <p className="font-medium">{t('storage.recovery.targets')}</p>
              <ul className="space-y-2">
                {plan.targetPolicies!.map((target) => (
                  <li
                    key={`${target.node}:${target.source}`}
                    className="border-border rounded-md border p-3"
                  >
                    <p className="break-words">
                      {target.node} → {target.source}
                    </p>
                    <p className="text-muted-foreground">
                      {t(`storage.recovery.policy.${target.policy}`)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {plan.preflightCurrent === false && (
            <p role="status" className="text-muted-foreground text-sm">
              {t('storage.recovery.stalePreview')}
            </p>
          )}
          {plan.phase === 'COMPLETE' && plan.scope === 'CLUSTER' && (
            <>
              <p className="text-muted-foreground text-sm">
                {t('storage.recovery.clusterComplete')}
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={action.busy}
                onClick={() => {
                  setPreviousOperationId(plan.operationId)
                  setScope('PIPELINE')
                  setPipelineIds('')
                  clearPlan()
                }}
              >
                {t('storage.recovery.selectPipeline')}
              </Button>
            </>
          )}
          {plan.phase === 'PLANNED' && canPlan && (
            <Button
              type="button"
              variant="outline"
              disabled={action.busy}
              onClick={() => {
                setConfirmed(false)
                void action.run(
                  () =>
                    storageRequest<RecoveryPlan>(fetcher, 'storage.recovery.plan', {
                      scope: plan.scope,
                      pipelineIds: plan.pipelineIds,
                      operationId: plan.operationId,
                    }),
                  (result) => {
                    setPlan(result)
                    setConfirmed(false)
                  },
                )
              }}
            >
              {t('storage.recovery.repreview')}
            </Button>
          )}
          {plan.phase === 'PLANNED' && canPlan && (
            <>
              <label className="flex items-start gap-2 text-sm">
                <input
                  className="mt-1"
                  type="checkbox"
                  checked={confirmed}
                  disabled={action.busy}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                <span>
                  {t(
                    plan.scope === 'CLUSTER'
                      ? 'storage.recovery.clusterConfirmHelp'
                      : 'storage.recovery.confirmHelp',
                  )}
                </span>
              </label>
              <Button
                className="min-h-11 sm:min-h-8"
                type="button"
                disabled={
                  !confirmed ||
                  action.busy ||
                  plan.preflightCurrent === false ||
                  (plan.scope === 'PIPELINE' &&
                    (plan.preflightCurrent !== true || !plan.targetPolicies?.length))
                }
                onClick={() =>
                  void action.run(
                    () =>
                      storageRequest<RecoveryPlan>(fetcher, 'storage.recovery.confirm', {
                        operationId: plan.operationId,
                        planHash: plan.planHash,
                        controlRevision: plan.controlRevision,
                        confirmed: true,
                      }),
                    async (result) => {
                      setPlan(result)
                      setConfirmed(false)
                      await refresh()
                    },
                  )
                }
              >
                {t(
                  plan.scope === 'CLUSTER'
                    ? 'storage.recovery.clusterConfirm'
                    : 'storage.recovery.confirm',
                )}
              </Button>
            </>
          )}
          {['CONFIRMED', 'RUNNING', 'COMPLETE'].includes(plan.phase) &&
            snapshot?.allowedActions.includes('storage.recovery.confirm') &&
            (plan.phase !== 'COMPLETE' || snapshot.businessPhase !== 'READY') && (
              <Button
                className="min-h-11 sm:min-h-8"
                type="button"
                variant="outline"
                disabled={action.busy}
                onClick={() =>
                  void action.run(
                    () =>
                      storageRequest<RecoveryPlan>(fetcher, 'storage.recovery.confirm', {
                        operationId: plan.operationId,
                        planHash: plan.planHash,
                        controlRevision: plan.controlRevision,
                        confirmed: true,
                      }),
                    async (result) => {
                      setPlan(result)
                      await refresh()
                    },
                  )
                }
              >
                {t('storage.recovery.continueOriginal')}
              </Button>
            )}
        </div>
      )}
      <label className="block space-y-1 text-sm">
        <span>{t('storage.operationId')}</span>
        <input
          className={inputClass}
          value={operationId}
          disabled={action.busy}
          onChange={(e) => {
            setOperationId(e.target.value)
            clearPlan()
          }}
        />
      </label>
      <p className="text-muted-foreground text-sm">{t('storage.originalResultHelp')}</p>
      <Button
        className="min-h-11 sm:min-h-8"
        type="button"
        variant="outline"
        disabled={!operationId.trim() || action.busy}
        onClick={() =>
          void action.run(
            () =>
              storageRequest<RecoveryPlan>(fetcher, 'storage.recovery.status', {
                operationId: operationId.trim(),
              }),
            async (result) => {
              setPlan(result)
              setConfirmed(false)
              if (result.phase === 'COMPLETE') await refresh()
            },
          )
        }
      >
        {t('storage.queryResult')}
      </Button>
      {Boolean(action.error) && <StorageError error={action.error} />}
    </section>
  )
}
export function splitIds(value: string): string[] {
  return [...new Set(value.split(/[\s,]+/).filter(Boolean))]
}
