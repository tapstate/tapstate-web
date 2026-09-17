import { ArrowDown, Braces, Database, GitBranch, Plus, Table2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { PipelineCreationModeDefinition } from './pipeline-creation-mode'

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
          {definition.value === 'wizard' ? (
            <WizardPreview />
          ) : (
            <DagPreview definition={definition} />
          )}
        </div>
        <div
          className="pipeline-create-preview__rule border-b-divider-subtle absolute inset-x-0 border-b"
          aria-hidden="true"
        />
      </div>
    </div>
  )
}

function DagPreview({ definition }: { definition: PipelineCreationModeDefinition }) {
  const { t } = useTranslation()
  const middleLabel = t(
    definition.value === 'sql'
      ? 'pipelines.createEntry.sqlTransform'
      : definition.value === 'ai'
        ? 'pipelines.createEntry.aiDraft'
        : 'pipelines.createEntry.dagStep',
  )

  return (
    <div
      className="pipeline-create-preview__stage pipeline-create-preview__stage--dag"
      role="img"
      aria-label={t('pipelines.createEntry.dagPreviewLabel')}
    >
      <div className="pipeline-create-preview__canvas-toolbar">
        <span>
          <GitBranch aria-hidden="true" /> {t('pipelines.createEntry.dagCanvas')}
        </span>
        <span className="pipeline-create-preview__toolbar-chip">
          {t('pipelines.createEntry.dagPreviewStatus')}
        </span>
      </div>
      <div className="pipeline-create-preview__graph-row">
        <PreviewNode label={t('pipelines.createEntry.dagSource')} tone="source" />
        <PreviewEdge />
        <PreviewNode label={middleLabel} tone="transform" />
        <PreviewEdge />
        <PreviewNode label={t('pipelines.createEntry.dagTarget')} tone="target" />
      </div>
      <div className="pipeline-create-preview__caption">
        <span className="pipeline-create-preview__caption-dot" aria-hidden="true" />
        {t('pipelines.createEntry.dagHint')}
      </div>
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
      <div className="pipeline-create-preview__wizard-step pipeline-create-preview__wizard-step--active">
        <span className="pipeline-create-preview__step-index">1</span>
        <div>
          <strong>
            <Database aria-hidden="true" />
            {t('pipelines.createEntry.wizardSource')}
          </strong>
          <span>{t('pipelines.createEntry.wizardSourceHint')}</span>
        </div>
        <Table2 aria-hidden="true" />
      </div>
      <div className="pipeline-create-preview__wizard-connector">
        <ArrowDown aria-hidden="true" />
        <span aria-hidden="true">
          <Plus aria-hidden="true" />
        </span>
      </div>
      <div className="pipeline-create-preview__wizard-step">
        <span className="pipeline-create-preview__step-index">2</span>
        <div>
          <strong>
            <Braces aria-hidden="true" />
            {t('pipelines.createEntry.wizardTransform')}
          </strong>
          <span>{t('pipelines.createEntry.wizardTransformHint')}</span>
        </div>
      </div>
      <div className="pipeline-create-preview__wizard-connector">
        <ArrowDown aria-hidden="true" />
        <span aria-hidden="true">
          <Plus aria-hidden="true" />
        </span>
      </div>
      <div className="pipeline-create-preview__wizard-step">
        <span className="pipeline-create-preview__step-index">3</span>
        <div>
          <strong>
            <Table2 aria-hidden="true" />
            {t('pipelines.createEntry.wizardOutput')}
          </strong>
          <span>{t('pipelines.createEntry.wizardOutputHint')}</span>
        </div>
      </div>
      <div className="pipeline-create-preview__caption">
        <span className="pipeline-create-preview__caption-dot" aria-hidden="true" />
        {t('pipelines.createEntry.wizardHint')}
      </div>
    </div>
  )
}

function PreviewNode({ label, tone }: { label: string; tone: 'source' | 'transform' | 'target' }) {
  return (
    <div className={`pipeline-create-preview__node pipeline-create-preview__node--${tone}`}>
      <span className="pipeline-create-preview__node-dot" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}

function PreviewEdge() {
  return (
    <span className="pipeline-create-preview__edge" aria-hidden="true">
      <span className="pipeline-create-preview__edge-dot" />
    </span>
  )
}
