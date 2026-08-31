import { useTranslation } from 'react-i18next'

import type { PipelineCreationModeDefinition } from './pipeline-creation-mode'

interface PipelineCreationOptionProps {
  definition: PipelineCreationModeDefinition
  selected: boolean
  onSelect: () => void
}

export function PipelineCreationOption({
  definition,
  selected,
  onSelect,
}: PipelineCreationOptionProps) {
  const { t } = useTranslation()
  const Icon = definition.icon

  return (
    <button
      type="button"
      className={`pipeline-create-option pipeline-create-option--${definition.tone}`}
      data-selected={selected ? 'true' : 'false'}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span className="pipeline-create-option__icon" aria-hidden="true">
        <Icon />
      </span>
      <span className="pipeline-create-option__body">
        <span className="pipeline-create-option__title">{t(definition.labelKey)}</span>
        <span className="pipeline-create-option__description">{t(definition.descriptionKey)}</span>
      </span>
    </button>
  )
}
