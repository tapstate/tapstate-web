import { useTranslation } from 'react-i18next'

import type { PipelineCreationModeDefinition } from './pipeline-creation-mode'

import builderPreviewImage from '../../assets/pipeline-builder-preview.png'
import dagPreviewImage from '../../assets/pipeline-dag-preview.png'

interface PipelineCreationPreviewProps {
  definition: PipelineCreationModeDefinition
}

export function PipelineCreationPreview({ definition }: PipelineCreationPreviewProps) {
  const { t } = useTranslation()

  return (
    <div
      className="pipeline-create-preview relative flex h-full flex-1 shrink justify-start overflow-hidden"
      aria-label={t('pipelines.createEntry.preview')}
    >
      <div
        className="pipeline-create-preview__top-rule border-b-divider-subtle absolute top-0 right-0 left-0 h-6 border-b 2xl:h-34.75"
        aria-hidden="true"
      />
      <div className="pipeline-create-preview__column border-x-divider-subtle max-w-190 border-x">
        <div className="pipeline-create-preview__top-spacer h-6 2xl:h-34.75" aria-hidden="true" />
        <div className="pipeline-create-preview__info px-8 py-4">
          <h4 className="system-sm-semibold-uppercase text-text-secondary">
            {t(definition.labelKey)}
          </h4>
          <div className="system-xs-regular text-text-tertiary mt-1 min-h-8 max-w-96">
            <span>{t(definition.descriptionKey)}</span>
          </div>
        </div>
        <div
          className="pipeline-create-preview__rule border-b-divider-subtle absolute inset-x-0 border-b"
          aria-hidden="true"
        />
        <div className="pipeline-create-preview__stage-shell">
          {definition.value === 'wizard' ? <WizardPreview /> : <DagPreview />}
        </div>
        <div
          className="pipeline-create-preview__rule border-b-divider-subtle absolute inset-x-0 border-b"
          aria-hidden="true"
        />
      </div>
    </div>
  )
}

function DagPreview() {
  const { t } = useTranslation()

  return (
    <div
      className="pipeline-create-preview__stage pipeline-create-preview__stage--dag"
      role="img"
      aria-label={t('pipelines.createEntry.dagPreviewLabel')}
    >
      <img
        className="pipeline-create-preview__image"
        src={dagPreviewImage}
        width={664}
        height={448}
        alt=""
      />
    </div>
  )
}

function WizardPreview() {
  const { t } = useTranslation()
  return (
    <div
      className="pipeline-create-preview__stage pipeline-create-preview__stage--wizard"
      role="img"
      aria-label={t('pipelines.createEntry.wizardPreviewLabel')}
    >
      <img
        className="pipeline-create-preview__image"
        src={builderPreviewImage}
        width={664}
        height={448}
        alt=""
      />
    </div>
  )
}
