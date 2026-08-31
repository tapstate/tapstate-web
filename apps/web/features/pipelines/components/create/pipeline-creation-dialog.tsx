import { useNavigate } from '@tanstack/react-router'
import { ArrowRight, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { createPipeline } from '@/service/pipelines/pipeline-client'
import { useAuthStore } from '@/stores/auth-store'

import type { PipelineCreationMode } from './pipeline-creation-mode'

import { WizardBuilder } from '../../pages/wizard-builder'
import { pipelineCreationModes } from './pipeline-creation-mode'
import { PipelineCreationOption } from './pipeline-creation-option'
import { PipelineCreationPreview as Preview } from './pipeline-creation-preview'

const pipelineIdPattern = /^[A-Za-z0-9_-]+$/

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
        await createPipeline(
          {
            id: normalizedId,
            metadata: { labels: {}, description: description.trim() || null },
            sources: [],
            transforms: [],
            view: null,
            serve: null,
            settings: null,
            experimental: null,
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
          <div className="pipeline-create-page__surface pipeline-create-dialog__surface">
            <button
              type="button"
              className="pipeline-create-page__close pipeline-create-dialog__close"
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
              <div className="pipeline-create-page__content">
                <main className="pipeline-create-page__form">
                  <div className="pipeline-create-page__top-spacer" aria-hidden="true" />
                  <h1>{t('pipelines.createEntry.title')}</h1>

                  <section
                    className="pipeline-create-page__section"
                    aria-labelledby="pipeline-create-mode-title"
                  >
                    <div className="pipeline-create-page__section-heading">
                      <h2 id="pipeline-create-mode-title">
                        {t('pipelines.createEntry.chooseMode')}
                      </h2>
                    </div>
                    <div className="pipeline-create-page__options">
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
                  </section>

                  <section
                    className="pipeline-create-page__section"
                    aria-labelledby="pipeline-create-identity-title"
                  >
                    <div className="pipeline-create-page__section-heading">
                      <h2 id="pipeline-create-identity-title">
                        {t('pipelines.createEntry.identityTitle')}
                      </h2>
                    </div>

                    <div className="pipeline-create-page__fields">
                      <label className="pipeline-create-page__field">
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
                        />
                        <span id="pipeline-create-id-hint" className="pipeline-create-page__hint">
                          {hasInvalidId
                            ? t('pipelines.createEntry.idInvalid')
                            : t('pipelines.createEntry.idHint')}
                        </span>
                      </label>
                      <label className="pipeline-create-page__field">
                        <span>
                          {t('pipelines.createEntry.descriptionLabel')}{' '}
                          <em>{t('pipelines.createEntry.descriptionOptional')}</em>
                        </span>
                        <textarea
                          value={description}
                          onChange={(event) => setDescription(event.target.value)}
                          placeholder={t('pipelines.createEntry.descriptionPlaceholder')}
                          rows={3}
                        />
                      </label>
                    </div>
                  </section>

                  <div className="pipeline-create-page__footer">
                    <button
                      type="button"
                      className="pipeline-create-page__cancel"
                      onClick={handleClose}
                    >
                      {t('pipelines.createEntry.cancel')}
                    </button>
                    <Button
                      type="button"
                      disabled={!isValidId}
                      onClick={() => void handleCreate()}
                      className="pipeline-create-page__continue"
                    >
                      {isCreating ? t('pipelines.workspace.actions.saving') : t('common.create')}
                      <ArrowRight aria-hidden="true" />
                    </Button>
                  </div>
                  {notice && (
                    <p className="pipeline-create-page__notice" role="status">
                      {notice}
                    </p>
                  )}
                </main>

                <Preview definition={selectedMode} />
              </div>
            )}
          </div>
        </section>
      </DialogContent>
    </Dialog>
  )
}
