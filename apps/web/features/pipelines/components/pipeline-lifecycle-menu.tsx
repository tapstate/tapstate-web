import { useQueryClient } from '@tanstack/react-query'
import { Button as SharedUIButton } from '@tapstate-web/ui/button'
import { Copy, LoaderCircle, MoreHorizontal, Pencil, Play, Square, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'

import type { ApiFetcher } from '@/service/source-client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import {
  deletePipeline,
  deletePipelineDraft,
  PipelineClientError,
  getPipelineDraft,
  getPipelineStatus,
  stopPipeline,
  type PipelineCatalogState,
} from '@/service/pipelines/pipeline-client'

import type { PipelineStarter } from '../start-checks/use-start-pipeline'

import { PIPELINE_AUTO_REFRESH_INTERVAL_MS } from './pipeline-refresh-controls'

export type PipelineLifecycleAction = 'start' | 'stop'

const lifecycleActionByState: Partial<Record<PipelineCatalogState, PipelineLifecycleAction>> = {
  NEW: 'start',
  STOPPED: 'start',
  COMPLETED: 'start',
  // A failed observation is a dead run whose desired state is still RUNNING.
  // The lifecycle contract requires stop, then start, to clear that intent.
  FAILED: 'stop',
  RUNNING: 'stop',
  PAUSED: 'stop',
}

export function PipelineLifecycleMenu({
  pipelineId,
  status,
  apiFetch,
  contentHash,
  draftRevision = null,
  presentation = 'list',
  startPipeline,
  onMutationError,
  onMutationStart,
  onDeleteIncomplete,
  onRequestDelete,
  onDeleteDialogClose,
}: {
  pipelineId: string
  status?: PipelineCatalogState
  apiFetch: ApiFetcher
  contentHash: string | null
  draftRevision?: number | null
  presentation?: 'list' | 'stop-button' | 'dialog-only'
  onRequestDelete?: () => void
  onDeleteDialogClose?: () => void
  /** The host's shared start flow; without it the menu offers no start. */
  startPipeline?: PipelineStarter
  onMutationError?: (action: PipelineLifecycleAction, error?: unknown) => void
  onMutationStart?: () => void
  onDeleteIncomplete?: (error: PipelineClientError) => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const moreTriggerRef = useRef<HTMLButtonElement>(null)
  const actionButtonRef = useRef<HTMLButtonElement>(null)
  const actionInFlight = useRef(false)
  const [pendingAction, setPendingAction] = useState<PipelineLifecycleAction | null>(null)
  const [stopDialogOpen, setStopDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(presentation === 'dialog-only')
  const [waitingForStop, setWaitingForStop] = useState(false)
  const [stopTimedOut, setStopTimedOut] = useState(false)
  const [stopCompleted, setStopCompleted] = useState(false)
  const [deletePending, setDeletePending] = useState(false)
  const [deleteError, setDeleteError] = useState<PipelineClientError | null>(null)
  const isDraft = contentHash === null
  const action = !isDraft && status ? lifecycleActionByState[status] : undefined
  const resolvedAction = action === 'start' && !startPipeline ? undefined : action

  const pending = pendingAction !== null || deletePending

  useEffect(() => {
    if (deleteDialogOpen && status === 'STOPPING' && !stopTimedOut && !stopCompleted)
      setWaitingForStop(true)
  }, [deleteDialogOpen, status, stopTimedOut, stopCompleted])

  useEffect(() => {
    if (
      !deleteDialogOpen ||
      stopTimedOut ||
      stopCompleted ||
      (!waitingForStop && status !== 'STOPPING')
    )
      return
    if (waitingForStop && status === 'STOPPED') {
      setWaitingForStop(false)
      setDeleteError(null)
      return
    }
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    async function pollStop() {
      try {
        const current = await getPipelineStatus(pipelineId, apiFetch)
        if (cancelled) return
        if (current.state === 'STOPPED') {
          setStopCompleted(true)
          setWaitingForStop(false)
          setDeleteError(null)
          await queryClient.invalidateQueries({ queryKey: ['pipelines'] }).catch(() => undefined)
          return
        }
      } catch {
        // Retry until the timeout so a transient status error does not lose the flow.
      }
      if (!cancelled) timer = setTimeout(pollStop, PIPELINE_AUTO_REFRESH_INTERVAL_MS)
    }
    timer = setTimeout(pollStop, PIPELINE_AUTO_REFRESH_INTERVAL_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [
    apiFetch,
    deleteDialogOpen,
    pipelineId,
    queryClient,
    status,
    waitingForStop,
    stopTimedOut,
    stopCompleted,
  ])

  useEffect(() => {
    if (!deleteDialogOpen || !waitingForStop) return
    const timeout = setTimeout(() => {
      setWaitingForStop(false)
      setStopTimedOut(true)
    }, 60_000)
    return () => clearTimeout(timeout)
  }, [deleteDialogOpen, waitingForStop])

  async function refreshProjections() {
    // The shared key prefix refreshes the catalog and any open detail projections.
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['pipelines'] }),
      queryClient.invalidateQueries({ queryKey: ['pipeline-artifacts'] }),
    ])
  }

  async function execute(
    nextAction: PipelineLifecycleAction,
    purgeState = false,
    returnFocus?: RefObject<HTMLElement | null>,
  ) {
    if (actionInFlight.current) return
    actionInFlight.current = true
    setPendingAction(nextAction)
    onMutationStart?.()

    try {
      if (nextAction === 'start') {
        // Start checks may stop the start to ask; the shared flow resolves once it is answered.
        const outcome = await startPipeline?.(pipelineId, returnFocus)
        if (outcome?.status === 'cancelled') {
          // Refresh stale projections without keeping a refused start busy.
          void refreshProjections().catch(() => undefined)
          return
        }
      } else {
        await stopPipeline(pipelineId, purgeState, apiFetch)
      }
      await refreshProjections()
      if (nextAction === 'stop') {
        setStopDialogOpen(false)
      }
    } catch (error) {
      if (nextAction === 'stop') {
        setStopDialogOpen(false)
      }
      // A lifecycle request can race with another worker or with a different
      // browser tab. Refresh the projection even when the server rejects the
      // transition so the menu reflects the authoritative runtime state.
      await refreshProjections().catch(() => undefined)
      onMutationError?.(nextAction, error)
    } finally {
      actionInFlight.current = false
      setPendingAction(null)
    }
  }

  async function executeDelete() {
    if (actionInFlight.current) return
    actionInFlight.current = true
    setDeletePending(true)
    setDeleteError(null)
    onMutationStart?.()

    try {
      if (contentHash === null) {
        const { etag } = await getPipelineDraft(pipelineId, apiFetch)
        await deletePipelineDraft(pipelineId, etag, apiFetch)
      } else {
        await deletePipeline(pipelineId, contentHash, draftRevision, apiFetch)
      }
      await refreshProjections()
      setDeleteDialogOpen(false)
      onDeleteDialogClose?.()
    } catch (error) {
      const failure =
        error instanceof PipelineClientError
          ? error
          : new PipelineClientError('network', t('pipelines.delete.failed'))
      if (failure.code === 'artifact.reclaim-incomplete' && onDeleteIncomplete) {
        setDeleteDialogOpen(false)
        onDeleteIncomplete(failure)
        onDeleteDialogClose?.()
      } else {
        setDeleteError(failure)
      }
      await refreshProjections().catch(() => undefined)
      if (failure.code === 'artifact.pipeline-not-stopped' && failure.params.desired === 'STOPPED')
        setWaitingForStop(true)
    } finally {
      actionInFlight.current = false
      setDeletePending(false)
    }
  }

  function copyPipelineId() {
    void navigator.clipboard?.writeText(pipelineId).catch(() => undefined)
  }

  const actionLabel = resolvedAction ? t(`pipelines.lifecycle.${resolvedAction}`) : null
  const actionAriaLabel = t(
    isDraft ? 'pipelines.actions.morePipeline' : 'pipelines.lifecycle.actions',
    { id: pipelineId },
  )
  const actionButtonLabel = resolvedAction ? `${actionLabel} pipeline ${pipelineId}` : null
  const editLabel = t('pipelines.actions.editPipeline', { id: pipelineId })
  const editHref = `/pipelines/${encodeURIComponent(pipelineId)}/edit`
  const ActionIcon = resolvedAction === 'start' ? Play : Square

  function requestAction(
    nextAction: PipelineLifecycleAction,
    returnFocus?: RefObject<HTMLElement | null>,
  ) {
    if (nextAction === 'stop') {
      onMutationStart?.()
      setStopDialogOpen(true)
      return
    }
    void execute(nextAction, false, returnFocus)
  }

  function renderLifecycleDropdown({
    triggerRef,
    triggerClassName,
    triggerLabel = actionAriaLabel,
  }: {
    triggerRef?: RefObject<HTMLButtonElement | null>
    triggerClassName?: string
    triggerLabel?: string
  }) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            ref={triggerRef}
            type="button"
            variant="ghost"
            size="icon-sm"
            className={cn(
              'pipeline-list__lifecycle-trigger rounded-none border-0',
              triggerClassName,
            )}
            aria-label={triggerLabel}
            disabled={pending}
          >
            {pending ? (
              <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <MoreHorizontal className="size-3.5" aria-hidden="true" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-32">
          <DropdownMenuGroup>
            {resolvedAction ? (
              <DropdownMenuItem
                disabled={pending}
                variant={resolvedAction === 'stop' ? 'destructive' : 'default'}
                onClick={() => {
                  // Row focus exposes the inline menu; the default trigger becomes transparent.
                  requestAction(resolvedAction, moreTriggerRef)
                }}
              >
                <ActionIcon className="size-4 shrink-0" aria-hidden="true" />
                {actionLabel}
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onClick={() => window.location.assign(editHref)}>
              <Pencil className="size-4 shrink-0" aria-hidden="true" />
              {editLabel}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={copyPipelineId}>
              <Copy className="size-4 shrink-0" aria-hidden="true" />
              {t('pipelines.actions.copyPipeline')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                if (onRequestDelete) onRequestDelete()
                else {
                  setDeleteError(null)
                  setDeleteDialogOpen(true)
                }
              }}
            >
              <Trash2 className="size-4 shrink-0" aria-hidden="true" />
              {t('pipelines.actions.deletePipeline')}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <>
      {presentation === 'dialog-only' ? null : presentation === 'stop-button' ? (
        <SharedUIButton
          type="button"
          variant="ghost"
          tone="destructive"
          size="medium"
          disabled={pending}
          aria-busy={pending}
          aria-label={t('pipelines.lifecycle.stopPipeline', { id: pipelineId })}
          onClick={() => requestAction('stop')}
        >
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Square className="size-3.5" fill="currentColor" aria-hidden="true" />
          )}
          {pending ? t('pipelines.lifecycle.stopping') : t('pipelines.lifecycle.stop')}
        </SharedUIButton>
      ) : (
        <div className="pipeline-list__lifecycle-menu">
          <div className="pipeline-list__actions-default pointer-events-auto flex items-center justify-end opacity-100 transition-opacity duration-200 group-focus-within:pointer-events-none group-focus-within:opacity-0 group-hover:pointer-events-none group-hover:opacity-0">
            {renderLifecycleDropdown({})}
          </div>
          <div className="pipeline-list__actions-hover pointer-events-none absolute top-1/2 right-4 z-10 flex -translate-y-1/2 items-center overflow-hidden border border-gray-200 bg-white opacity-0 transition-opacity duration-200 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100">
            {resolvedAction && (
              <button
                ref={actionButtonRef}
                type="button"
                className={cn(
                  'pipeline-list__action-button border-r border-gray-200 px-2.5 py-1.5 text-gray-500 transition-colors hover:bg-gray-50 aria-disabled:cursor-wait aria-disabled:opacity-60',
                  resolvedAction === 'start'
                    ? 'text-emerald-600 hover:text-emerald-700'
                    : 'text-amber-600 hover:text-amber-700',
                )}
                aria-label={actionButtonLabel ?? undefined}
                title={actionButtonLabel ?? undefined}
                disabled={pending && resolvedAction !== 'start'}
                aria-disabled={pending || undefined}
                onClick={() => requestAction(resolvedAction, actionButtonRef)}
              >
                {pending ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <ActionIcon className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true" />
                )}
              </button>
            )}
            <a
              href={editHref}
              className="pipeline-list__action-button border-r border-gray-200 px-2.5 py-1.5 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900"
              aria-label={editLabel}
              title={editLabel}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
            {renderLifecycleDropdown({
              triggerRef: moreTriggerRef,
              triggerLabel: t('pipelines.actions.morePipeline', { id: pipelineId }),
              triggerClassName:
                'pipeline-list__action-button h-auto w-auto rounded-none border-0 px-2.5 py-1.5 transition-colors hover:bg-gray-50 hover:text-gray-900',
            })}
          </div>
        </div>
      )}

      <Dialog
        open={stopDialogOpen}
        onOpenChange={(open) => {
          if (!pending) {
            setStopDialogOpen(open)
          }
        }}
      >
        <DialogContent
          closeDisabled={pending}
          closeLabel={t('pipelines.lifecycle.cancel')}
          className="min-w-0 sm:max-w-[420px]"
        >
          <DialogHeader>
            <DialogTitle className="[overflow-wrap:anywhere] break-words">
              {t('pipelines.lifecycle.confirmStopTitle', { id: pipelineId })}
            </DialogTitle>
            <DialogDescription>{t('pipelines.lifecycle.confirmStopBody')}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-col [&>button]:w-full [&>button]:min-w-0 [&>button]:whitespace-normal">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              className="px-3 text-[13px]"
              onClick={() => {
                setStopDialogOpen(false)
              }}
            >
              {t('pipelines.lifecycle.cancel')}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              className="px-3 text-[13px]"
              onClick={() => void execute('stop', false)}
            >
              {pendingAction === 'stop' && <LoaderCircle className="animate-spin" />}
              {t('pipelines.lifecycle.confirmStopKeepState')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              className="px-3 text-[13px]"
              onClick={() => void execute('stop', true)}
            >
              {pendingAction === 'stop' && <LoaderCircle className="animate-spin" />}
              {t('pipelines.lifecycle.confirmStopClearState')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!deletePending) {
            setDeleteDialogOpen(open)
            if (!open) onDeleteDialogClose?.()
          }
        }}
      >
        <DialogContent
          closeDisabled={deletePending}
          closeLabel={t('pipelines.lifecycle.cancel')}
          className="sm:max-w-[420px]"
        >
          <DialogHeader>
            <DialogTitle>{t('pipelines.delete.title', { id: pipelineId })}</DialogTitle>
            <DialogDescription>{t('pipelines.delete.body')}</DialogDescription>
          </DialogHeader>
          {stopTimedOut && (
            <DialogBody>
              <p role="alert">
                {deleteError && deleteError.code !== 'artifact.pipeline-not-stopped'
                  ? deleteError.message
                  : t('pipelines.delete.stopTimedOut')}
              </p>
            </DialogBody>
          )}
          {!deleteError &&
            !stopTimedOut &&
            (waitingForStop || (status === 'STOPPING' && !stopCompleted)) && (
              <DialogBody>
                <p role="status" className="system-sm-regular text-text-secondary">
                  {t('pipelines.delete.waitingForStop')}
                </p>
              </DialogBody>
            )}
          {deleteError && !stopTimedOut && (
            <DialogBody>
              <div
                role="alert"
                className="text-text-destructive system-sm-regular space-y-3 break-words"
              >
                <p>
                  {t(
                    deleteError.code === 'artifact.pipeline-not-stopped'
                      ? 'pipelines.delete.notStopped'
                      : deleteError.code === 'artifact.in-use'
                        ? 'pipelines.delete.inUse'
                        : deleteError.code === 'artifact.reclaim-incomplete'
                          ? 'pipelines.delete.incomplete'
                          : deleteError.code?.includes('conflict')
                            ? 'pipelines.delete.conflict'
                            : 'pipelines.delete.failed',
                    {
                      id: pipelineId,
                      actual:
                        typeof deleteError.params.actual === 'string'
                          ? deleteError.params.actual
                          : '—',
                      desired:
                        typeof deleteError.params.desired === 'string'
                          ? deleteError.params.desired
                          : '—',
                      referrers: Array.isArray(deleteError.params.referrers)
                        ? deleteError.params.referrers.map(String).join(', ')
                        : '—',
                    },
                  )}
                </p>
                {deleteError.code === 'artifact.pipeline-not-stopped' &&
                  (deleteError.params.desired === 'STOPPED' ? (
                    <p className="text-text-secondary">{t('pipelines.delete.waitingForStop')}</p>
                  ) : null)}
              </div>
            </DialogBody>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deletePending}
              className="px-3 text-[13px]"
              onClick={() => {
                setDeleteDialogOpen(false)
                onDeleteDialogClose?.()
              }}
            >
              {t('pipelines.lifecycle.cancel')}
            </Button>
            {stopTimedOut ||
            (deleteError?.code === 'artifact.pipeline-not-stopped' &&
              deleteError.params.desired !== 'STOPPED') ? (
              <Button
                type="button"
                variant="destructive"
                disabled={pending}
                onClick={() => {
                  setStopTimedOut(false)
                  setStopCompleted(false)
                  setPendingAction('stop')
                  void stopPipeline(pipelineId, false, apiFetch)
                    .then(async () => {
                      setDeleteError(null)
                      await refreshProjections()
                      setWaitingForStop(true)
                    })
                    .catch((error: unknown) => {
                      setStopTimedOut(true)
                      setDeleteError(
                        error instanceof PipelineClientError
                          ? error
                          : new PipelineClientError('network', t('pipelines.delete.failed')),
                      )
                    })
                    .finally(() => setPendingAction(null))
                }}
              >
                {pendingAction === 'stop' && <LoaderCircle className="animate-spin" />}
                {t('pipelines.delete.stopPipeline')}
              </Button>
            ) : (
              <Button
                type="button"
                variant="destructive"
                disabled={
                  deletePending || waitingForStop || (status === 'STOPPING' && !stopCompleted)
                }
                className="px-3 text-[13px]"
                onClick={() => void executeDelete()}
              >
                {(deletePending || waitingForStop || (status === 'STOPPING' && !stopCompleted)) && (
                  <LoaderCircle className="animate-spin" />
                )}
                {t('pipelines.delete.confirm')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** The page owns this notice so a removed catalog row cannot dismiss an incomplete cleanup. */
export function PipelineDeletionCleanupNotice({
  pipelineId,
  error,
  onDismiss,
}: {
  pipelineId: string
  error: PipelineClientError
  onDismiss: () => void
}) {
  const { t } = useTranslation()
  const reason =
    typeof error.params.reason === 'string'
      ? error.params.reason
      : t('pipelines.delete.unknownCleanup')
  const residue = Array.isArray(error.params.residue) ? error.params.residue.map(String) : []
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onDismiss()
      }}
    >
      <DialogContent closeLabel={t('pipelines.lifecycle.cancel')}>
        <DialogHeader>
          <DialogTitle>{t('pipelines.delete.cleanupTitle', { id: pipelineId })}</DialogTitle>
          <DialogDescription>{t('pipelines.delete.incomplete')}</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div role="alert" className="system-sm-regular text-text-secondary space-y-3 break-words">
            <p>{error.message}</p>
            <p>{t('pipelines.delete.cleanupReason', { reason })}</p>
            {residue.length > 0 ? (
              <ul className="list-disc space-y-1 ps-5">
                {residue.map((item, index) => (
                  <li key={`${index}:${item}`}>{item}</li>
                ))}
              </ul>
            ) : (
              <p>{t('pipelines.delete.unknownCleanup')}</p>
            )}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDismiss}>
            {t('pipelines.delete.dismiss')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
