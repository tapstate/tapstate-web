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
        className="pipeline-create-preview__top-rule absolute top-0 right-0 left-0 h-6 border-b border-b-divider-subtle 2xl:h-34.75"
        aria-hidden="true"
      />
      <div className="pipeline-create-preview__column max-w-190 border-x border-x-divider-subtle">
        <div className="pipeline-create-preview__top-spacer h-6 2xl:h-34.75" aria-hidden="true" />
        <div className="pipeline-create-preview__info px-8 py-4">
          <h4 className="system-sm-semibold-uppercase text-text-secondary">
            {t(definition.labelKey)}
          </h4>
          <div className="mt-1 min-h-8 max-w-96 system-xs-regular text-text-tertiary">
            <span>{t(definition.descriptionKey)}</span>
          </div>
        </div>
        <div
          className="pipeline-create-preview__rule absolute inset-x-0 border-b border-b-divider-subtle"
          aria-hidden="true"
        />
        <div className="pipeline-create-preview__stage-shell">
          <div
            className={`pipeline-create-preview__stage pipeline-create-preview__stage--${definition.tone} flex h-112 w-166 items-center justify-center`}
            role="img"
            aria-label={`${t('pipelines.createEntry.preview')}: ${t(definition.labelKey)}`}
            style={{
              background:
                'repeating-linear-gradient(135deg, transparent, transparent 2px, rgba(16, 24, 40, 0.04) 4px, transparent 3px, transparent 6px)',
            }}
          >
            <div className="pipeline-create-preview__grid" aria-hidden="true" />
            <div
              className="pipeline-create-preview__lane pipeline-create-preview__lane--one"
              aria-hidden="true"
            />
            <div
              className="pipeline-create-preview__lane pipeline-create-preview__lane--two"
              aria-hidden="true"
            />
            <PreviewNode label="Source" tone="source" />
            <PreviewNode
              label={
                definition.value === 'sql'
                  ? 'SQL transform'
                  : definition.value === 'dag'
                    ? 'DAG step'
                    : definition.value === 'ai'
                      ? 'AI draft'
                      : 'Pipeline step'
              }
              tone="transform"
            />
            <PreviewNode label="Target" tone="target" />
            <div className="pipeline-create-preview__caption">
              <span className="pipeline-create-preview__caption-dot" aria-hidden="true" />
              {t('pipelines.createEntry.previewHint')}
            </div>
          </div>
        </div>
        <div
          className="pipeline-create-preview__rule absolute inset-x-0 border-b border-b-divider-subtle"
          aria-hidden="true"
        />
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
