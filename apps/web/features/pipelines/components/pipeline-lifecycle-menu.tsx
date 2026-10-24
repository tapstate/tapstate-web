import { Button as SharedUIButton } from '@tapstate-web/ui/button'
import { useQueryClient } from '@tanstack/react-query'
import { Copy, LoaderCircle, MoreHorizontal, Pencil, Play, Square, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { ApiFetcher } from '@/service/source-client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
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
  deletePipelineDraft,
  getPipelineDraft,
  stopPipeline,
  type PipelineCatalogState,
} from '@/service/pipelines/pipeline-client'

import type { PipelineStartOutcome } from '../start-checks/use-start-pipeline'

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
  presentation = 'list',
  startPipeline,
  onMutationError,
  onMutationStart,
}: {
  pipelineId: string
  status?: PipelineCatalogState
  apiFetch: ApiFetcher
  contentHash: string | null
  presentation?: 'list' | 'stop-button'
  /** The host's shared start flow; without it the menu offers no start. */
  startPipeline?: (pipelineId: string) => Promise<PipelineStartOutcome>
  onMutationError?: (action: PipelineLifecycleAction, error?: unknown) => void
  onMutationStart?: () => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [pendingAction, setPendingAction] = useState<PipelineLifecycleAction | null>(null)
  const [stopDialogOpen, setStopDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletePending, setDeletePending] = useState(false)
  const [deleteError, setDeleteError] = useState(false)
  const isDraft = contentHash === null
  const action = !isDraft && status ? lifecycleActionByState[status] : undefined
  const resolvedAction = action === 'start' && !startPipeline ? undefined : action

  const pending = pendingAction !== null || deletePending

  async function refreshProjections() {
    // The shared key prefix refreshes the catalog and any open detail projections.
    await queryClient.invalidateQueries({ queryKey: ['pipelines'] })
  }

  async function execute(nextAction: PipelineLifecycleAction, purgeState = false) {
    setPendingAction(nextAction)
    onMutationStart?.()

    try {
      if (nextAction === 'start') {
        // Start checks may stop the start to ask; the shared flow resolves once it is answered.
        await startPipeline?.(pipelineId)
      } else {
        await stopPipeline(pipelineId, purgeState, apiFetch)
      }
      await refreshProjections()
      if (nextAction === 'stop') setStopDialogOpen(false)
    } catch (error) {
      if (nextAction === 'stop') setStopDialogOpen(false)
      // A lifecycle request can race with another worker or with a different
      // browser tab. Refresh the projection even when the server rejects the
      // transition so the menu reflects the authoritative runtime state.
      await refreshProjections().catch(() => undefined)
      onMutationError?.(nextAction, error)
    } finally {
      setPendingAction(null)
    }
  }

  async function executeDelete() {
    setDeletePending(true)
    setDeleteError(false)
    onMutationStart?.()

    try {
      if (contentHash === null) {
        const { etag } = await getPipelineDraft(pipelineId, apiFetch)
        await deletePipelineDraft(pipelineId, etag, apiFetch)
      } else {
        const response = await apiFetch(`/api/artifacts/${encodeURIComponent(pipelineId)}`, {
          method: 'DELETE',
          headers: { 'If-Match': `"${contentHash}"` },
        })
        if (!response.ok) throw new Error('Pipeline deletion failed')
      }
      await refreshProjections()
      setDeleteDialogOpen(false)
    } catch {
      setDeleteError(true)
    } finally {
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

  function requestAction(nextAction: PipelineLifecycleAction) {
    if (nextAction === 'stop') {
      onMutationStart?.()
      setStopDialogOpen(true)
      return
    }
    void execute(nextAction)
  }

  function LifecycleDropdown({
    triggerClassName,
    triggerLabel = actionAriaLabel,
  }: { triggerClassName?: string; triggerLabel?: string } = {}) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
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
                onClick={() => requestAction(resolvedAction)}
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
                setDeleteError(false)
                setDeleteDialogOpen(true)
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
      {presentation === 'stop-button' ? (
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
            <LifecycleDropdown />
          </div>
          <div className="pipeline-list__actions-hover pointer-events-none absolute top-1/2 right-4 z-10 flex -translate-y-1/2 items-center overflow-hidden border border-gray-200 bg-white opacity-0 transition-opacity duration-200 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100">
            {resolvedAction && (
              <button
                type="button"
                className={cn(
                  'pipeline-list__action-button border-r border-gray-200 px-2.5 py-1.5 text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60',
                  resolvedAction === 'start'
                    ? 'text-emerald-600 hover:text-emerald-700'
                    : 'text-amber-600 hover:text-amber-700',
                )}
                aria-label={actionButtonLabel ?? undefined}
                title={actionButtonLabel ?? undefined}
                disabled={pending}
                onClick={() => requestAction(resolvedAction)}
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
            <LifecycleDropdown
              triggerLabel={t('pipelines.actions.morePipeline', { id: pipelineId })}
              triggerClassName="pipeline-list__action-button h-auto w-auto rounded-none border-0 px-2.5 py-1.5 transition-colors hover:bg-gray-50 hover:text-gray-900"
            />
          </div>
        </div>
      )}

      <Dialog
        open={stopDialogOpen}
        onOpenChange={(open) => {
          if (!pending) setStopDialogOpen(open)
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
              onClick={() => setStopDialogOpen(false)}
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
          if (!deletePending) setDeleteDialogOpen(open)
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
          {deleteError && (
            <p role="alert" className="text-destructive text-[13px]">
              {t('pipelines.delete.failed')}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deletePending}
              className="px-3 text-[13px]"
              onClick={() => setDeleteDialogOpen(false)}
            >
              {t('pipelines.lifecycle.cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deletePending}
              className="px-3 text-[13px]"
              onClick={() => void executeDelete()}
            >
              {deletePending && <LoaderCircle className="animate-spin" />}
              {t('pipelines.delete.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
