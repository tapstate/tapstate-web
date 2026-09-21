import { useNavigate } from '@tanstack/react-router'
import { X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { createPipelineDraft } from '@/service/pipelines/pipeline-client'
import { useAuthStore } from '@/stores/auth-store'

import type { PipelineCreationMode } from './pipeline-creation-mode'

import { WizardBuilder } from '../../pages/wizard-builder'
import { pipelineCreationModes } from './pipeline-creation-mode'
import { PipelineCreationOption } from './pipeline-creation-option'
import { PipelineCreationPreview as Preview } from './pipeline-creation-preview'

const pipelineIdPattern = /^[A-Za-z0-9_-]+$/
const CREATE_PIPELINE_HOTKEY = 'Mod+Enter'

export interface PipelineCreationDialogProps {
  open: boolean
  onClose: () => void
}

export function PipelineCreationDialog({ open, onClose }: PipelineCreationDialogProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const [mode, setMode] = useState<PipelineCreationMode>('dag')
  const [pipelineId, setPipelineId] = useState('')
  const [description, setDescription] = useState('')
  const [wizardStarted, setWizardStarted] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const selectedMode = useMemo(
    () =>
      pipelineCreationModes.find((candidate) => candidate.value === mode) ??
      pipelineCreationModes[0],
    [mode],
  )
  const normalizedId = pipelineId.trim()
  const isValidId =
    normalizedId.length > 0 && normalizedId.length <= 64 && pipelineIdPattern.test(normalizedId)
  const hasInvalidId = pipelineId.length > 0 && !isValidId

  const handleClose = () => {
    setWizardStarted(false)
    setNotice(null)
    onClose()
  }

  const handleCreate = async () => {
    if (!isValidId || isCreating) return

    if (mode === 'wizard') {
      setNotice(null)
      setWizardStarted(true)
      return
    }

    if (mode === 'dag') {
      setIsCreating(true)
      setNotice(null)
      try {
        await createPipelineDraft(
          normalizedId,
          {
            pipelineId: normalizedId,
            mode: 'dag',
            name: normalizedId,
            description: description.trim() || null,
            graph: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
            wizard: null,
            baseArtifactHash: null,
          },
          apiFetch,
        )
        handleClose()
        await navigate({
          to: '/pipelines/$pipelineId/edit',
          params: { pipelineId: normalizedId },
        })
      } catch (error) {
        setNotice(
          error instanceof Error ? error.message : t('pipelines.workspace.actions.saveFailed'),
        )
      } finally {
        setIsCreating(false)
      }
      return
    }

    setNotice(t('pipelines.createEntry.comingSoon', { mode: t(selectedMode.labelKey) }))
  }

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault()
        void handleCreate()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, handleCreate])

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handleClose()
      }}
    >
      <DialogContent
        showCloseButton={false}
        overlayClassName="pipeline-create-dialog-overlay"
        className="top-0 left-0 h-screen max-h-none w-screen max-w-none translate-0 overflow-hidden rounded-none border-none bg-transparent p-4 shadow-none sm:max-w-none"
        style={{ top: 0, left: 0, transform: 'none' }}
      >
        <DialogTitle className="sr-only">{t('pipelines.createEntry.title')}</DialogTitle>
        <section
          className="pipeline-create-page pipeline-create-dialog"
          data-testid="pipeline-creation-dialog"
        >
          <div className="pipeline-create-dialog__surface">
            <button
              type="button"
              className="pipeline-create-dialog__close"
              aria-label={t('pipelines.createEntry.close')}
              onClick={handleClose}
            >
              <X aria-hidden="true" />
            </button>

            {wizardStarted ? (
              <WizardBuilder
                pipelineId={normalizedId}
                description={description.trim()}
                onBack={() => setWizardStarted(false)}
              />
            ) : (
              <div className="flex h-full justify-center overflow-x-hidden overflow-y-auto">
                <div className="flex flex-1 shrink-0 justify-end">
                  <main className="w-full max-w-185 shrink-0 px-10 pb-10 max-sm:px-4 max-sm:pb-6">
                    <div className="h-6 w-full 2xl:h-34.75" aria-hidden="true" />
                    <div className="pt-1 pb-6">
                      <h1 className="text-2xl font-semibold tracking-tight text-[var(--pipeline-create-text)]">
                        {t('pipelines.createEntry.title')}
                      </h1>
                    </div>

                    <section aria-labelledby="pipeline-create-mode-title">
                      <div className="mb-2 leading-6">
                        <h2
                          id="pipeline-create-mode-title"
                          className="text-[13px] font-semibold text-[var(--pipeline-create-text)]"
                        >
                          {t('pipelines.createEntry.chooseMode')}
                        </h2>
                      </div>
                      <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-2 max-sm:grid-cols-1">
                          {pipelineCreationModes.map((candidate) => (
                            <PipelineCreationOption
                              key={candidate.value}
                              definition={candidate}
                              selected={candidate.value === mode}
                              onSelect={() => {
                                setMode(candidate.value)
                                setNotice(null)
                              }}
                            />
                          ))}
                        </div>

                        <div>
                          <div className="mb-2 flex items-center leading-6">
                            <h2
                              id="pipeline-create-identity-title"
                              className="text-[13px] font-semibold text-[var(--pipeline-create-text)]"
                            >
                              {t('pipelines.createEntry.identityTitle')}
                            </h2>
                          </div>

                          <div className="flex flex-col gap-3">
                            <label className="flex flex-col gap-1 text-[13px] leading-5 font-semibold text-[var(--pipeline-create-text)]">
                              <span>{t('pipelines.createEntry.idLabel')}</span>
                              <input
                                value={pipelineId}
                                onChange={(event) => setPipelineId(event.target.value)}
                                placeholder={t('pipelines.createEntry.idPlaceholder')}
                                maxLength={64}
                                spellCheck={false}
                                autoComplete="off"
                                aria-invalid={hasInvalidId}
                                aria-describedby="pipeline-create-id-hint"
                                className="h-9 w-full rounded-lg border border-[var(--pipeline-create-input-border)] bg-[var(--pipeline-create-input-bg)] px-3 text-[13px] font-medium text-[var(--pipeline-create-text)] outline-hidden transition-[border-color,box-shadow] placeholder:text-[var(--pipeline-create-muted)]/60 focus:border-[var(--pipeline-create-input-border-active)] focus:ring-3 focus:ring-[#0033ff]/10"
                              />
                              <span
                                id="pipeline-create-id-hint"
                                className="text-xs leading-[1.45] font-normal text-[var(--pipeline-create-muted)]"
                              >
                                {hasInvalidId
                                  ? t('pipelines.createEntry.idInvalid')
                                  : t('pipelines.createEntry.idHint')}
                              </span>
                            </label>
                            <label className="flex flex-col gap-1 text-[13px] leading-5 font-semibold text-[var(--pipeline-create-text)]">
                              <span>
                                {t('pipelines.createEntry.descriptionLabel')}{' '}
                                <em>{t('pipelines.createEntry.descriptionOptional')}</em>
                              </span>
                              <textarea
                                value={description}
                                onChange={(event) => setDescription(event.target.value)}
                                placeholder={t('pipelines.createEntry.descriptionPlaceholder')}
                                rows={3}
                                className="min-h-18 resize-none rounded-lg border border-[var(--pipeline-create-input-border)] bg-[var(--pipeline-create-input-bg)] px-3 py-2.5 text-[13px] font-medium text-[var(--pipeline-create-text)] outline-hidden transition-[border-color,box-shadow] placeholder:text-[var(--pipeline-create-muted)]/60 focus:border-[var(--pipeline-create-input-border-active)] focus:ring-3 focus:ring-[#0033ff]/10"
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    </section>

                    <div className="flex items-center justify-between pt-5 pb-10">
                      <div />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="pipeline-create-dialog__cancel"
                          onClick={handleClose}
                        >
                          {t('pipelines.createEntry.cancel')}
                        </button>
                        <Button
                          type="button"
                          disabled={!isValidId || isCreating}
                          onClick={() => void handleCreate()}
                          className="pipeline-create-dialog__submit"
                        >
                          <span>
                            {isCreating
                              ? t('pipelines.workspace.actions.saving')
                              : t('common.create')}
                          </span>
                          <span
                            aria-label={CREATE_PIPELINE_HOTKEY}
                            className="pipeline-create-dialog__shortcut"
                          >
                            <kbd>⌘</kbd>
                            <kbd>↵</kbd>
                          </span>
                        </Button>
                      </div>
                    </div>
                    {notice && (
                      <p
                        className="mt-3 rounded-lg border border-[var(--pipeline-create-border)] bg-[var(--pipeline-create-surface-subtle)] px-3 py-2 text-xs leading-[1.45] text-[var(--pipeline-create-muted)]"
                        role="status"
                      >
                        {notice}
                      </p>
                    )}
                  </main>
                </div>

                <Preview definition={selectedMode} />
              </div>
            )}
          </div>
        </section>
      </DialogContent>
    </Dialog>
  )
}
