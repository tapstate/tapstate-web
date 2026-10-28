import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@tapstate-web/ui/button'
import {
  Dialog,
  DialogBackdrop,
  DialogPopup,
  DialogPortal,
  DialogTitle,
} from '@tapstate-web/ui/dialog'
import { Field, FieldDescription } from '@tapstate-web/ui/field'
import { Fieldset, FieldsetLegend } from '@tapstate-web/ui/fieldset'
import { Input } from '@tapstate-web/ui/input'
import { Kbd, KbdGroup } from '@tapstate-web/ui/kbd'
import { Separator } from '@tapstate-web/ui/separator'
import { Textarea } from '@tapstate-web/ui/textarea'
import { useEffect, useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { createPipelineDraft } from '@/service/pipelines/pipeline-client'
import { useAuthStore } from '@/stores/auth-store'

import type { PipelineCreationMode } from './pipeline-creation-mode'

import { getDeploymentProfile } from '../../model/deployment-profile'
import {
  availablePipelineCreationModes,
  normalizePipelineCreationMode,
  pipelineCreationModes,
} from './pipeline-creation-mode'
import { PipelineCreationOption } from './pipeline-creation-option'
import { PipelineCreationPreview as Preview } from './pipeline-creation-preview'

const pipelineIdPattern = /^[A-Za-z0-9_-]+$/
const CREATE_PIPELINE_HOTKEY = 'Mod+Enter'

function createPipelineShortcutKeys() {
  const applePlatform =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform)
  return applePlatform ? ['⌘', '↵'] : ['Ctrl', 'Enter']
}

export interface PipelineCreationDialogProps {
  open: boolean
  onClose: () => void
  defaultMode?: PipelineCreationMode
}

export function PipelineCreationDialog({
  open,
  onClose,
  defaultMode = 'wizard',
}: PipelineCreationDialogProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const descriptionInputId = useId()
  const idHint = 'pipeline-create-id-hint'
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const queryClient = useQueryClient()
  const shortcutKeys = createPipelineShortcutKeys()
  const [mode, setMode] = useState<PipelineCreationMode>(() =>
    normalizePipelineCreationMode(defaultMode),
  )
  const [pipelineId, setPipelineId] = useState('')
  const [description, setDescription] = useState('')
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
    setNotice(null)
    onClose()
  }

  const handleCreate = async () => {
    if (!isValidId || isCreating) return

    if (mode === 'wizard') {
      setIsCreating(true)
      setNotice(null)
      try {
        await createPipelineDraft(
          normalizedId,
          {
            pipelineId: normalizedId,
            mode: 'wizard',
            name: normalizedId,
            description: description.trim() || null,
            graph: null,
            wizard: {
              root: { id: 'root', sourceId: '', table: '', key: [], preTransforms: [] },
              related: [],
              transforms: [],
              output: {
                kind: getDeploymentProfile() === 'cloud' ? 'atlas' : 'source',
                config: {},
              },
            },
            baseArtifactHash: null,
          },
          apiFetch,
        )
        await queryClient.invalidateQueries({ queryKey: ['pipelines'] })
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
      <DialogPortal>
        <DialogBackdrop className="bg-background-overlay-backdrop backdrop-blur-[6px]" />
        <DialogPopup className="fixed top-0 left-0 z-50 h-screen w-screen overflow-hidden overscroll-contain p-4">
          <section
            className="pipeline-create-page pipeline-create-dialog"
            data-testid="pipeline-creation-dialog"
          >
            <div className="pipeline-create-dialog__surface">
              <DialogTitle className="sr-only">{t('pipelines.createEntry.title')}</DialogTitle>
              <button
                type="button"
                className="bg-components-button-tertiary-bg hover:bg-components-button-tertiary-bg-hover focus-visible:ring-components-input-border-active absolute top-3 right-3 z-50 flex size-9 cursor-pointer items-center justify-center rounded-[10px] focus-visible:ring-1 focus-visible:outline-hidden"
                aria-label={t('pipelines.createEntry.close')}
                onClick={handleClose}
              >
                <span className="i-ri-close-large-line size-3.5" aria-hidden="true" />
              </button>

              <div className="flex h-full justify-center overflow-x-hidden overflow-y-auto">
                <div className="flex flex-1 shrink-0 justify-end">
                  <main className="w-full max-w-185 shrink-0 px-10 pb-10 max-sm:px-4 max-sm:pb-6">
                    <div className="h-6 w-full 2xl:h-34.75" aria-hidden="true" />
                    <div className="pt-1 pb-6">
                      <h1 className="title-2xl-semi-bold text-text-primary">
                        {t('pipelines.createEntry.title')}
                      </h1>
                    </div>

                    <section aria-labelledby="pipeline-create-mode-title">
                      <div className="mb-2 leading-6">
                        <h2
                          id="pipeline-create-mode-title"
                          className="system-sm-semibold text-text-secondary"
                        >
                          {t('pipelines.createEntry.chooseMode')}
                        </h2>
                      </div>
                      <div className="flex w-165 flex-col gap-4 max-sm:w-full">
                        <div className="flex flex-row gap-2 max-sm:flex-col">
                          {availablePipelineCreationModes.map((candidate) => (
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

                        <Separator />

                        <div>
                          <Fieldset className="mb-4">
                            <FieldsetLegend className="system-sm-semibold text-text-secondary flex h-6 items-center py-0">
                              {t('pipelines.createEntry.identityTitle')}
                            </FieldsetLegend>
                            <Field name="pipelineId">
                              <Input
                                autoFocus
                                aria-label={t('pipelines.createEntry.idLabel')}
                                value={pipelineId}
                                onChange={(event) => setPipelineId(event.target.value)}
                                placeholder={t('pipelines.createEntry.idPlaceholder')}
                                maxLength={64}
                                spellCheck={false}
                                autoComplete="off"
                                aria-invalid={hasInvalidId}
                                aria-describedby={idHint}
                              />
                              <FieldDescription id={idHint}>
                                {hasInvalidId
                                  ? t('pipelines.createEntry.idInvalid')
                                  : t('pipelines.createEntry.idHint')}
                              </FieldDescription>
                            </Field>
                          </Fieldset>
                          <div>
                            <div className="mb-1 flex h-6 items-center">
                              <label
                                htmlFor={descriptionInputId}
                                className="system-sm-semibold text-text-secondary"
                              >
                                {t('pipelines.createEntry.descriptionLabel')}{' '}
                              </label>
                              <span className="body-xs-regular text-text-tertiary ml-1">
                                ({t('pipelines.createEntry.descriptionOptional')})
                              </span>
                            </div>
                            <Textarea
                              id={descriptionInputId}
                              value={description}
                              onValueChange={(value) => setDescription(value)}
                              placeholder={t('pipelines.createEntry.descriptionPlaceholder')}
                              className="min-h-24 resize-none"
                            />
                          </div>
                        </div>
                      </div>
                    </section>

                    <div className="flex items-center justify-between pt-5 pb-10">
                      <div />
                      <div className="flex gap-2">
                        <Button type="button" variant="secondary" onClick={handleClose}>
                          {t('pipelines.createEntry.cancel')}
                        </Button>
                        <Button
                          type="button"
                          disabled={!isValidId || isCreating}
                          loading={isCreating}
                          variant="primary"
                          onClick={() => void handleCreate()}
                          className="pipeline-create-dialog__submit"
                        >
                          {t('common.create')}
                          <KbdGroup aria-label={CREATE_PIPELINE_HOTKEY}>
                            {shortcutKeys.map((key) => (
                              <Kbd key={key} color="white">
                                {key}
                              </Kbd>
                            ))}
                          </KbdGroup>
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
            </div>
          </section>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  )
}
