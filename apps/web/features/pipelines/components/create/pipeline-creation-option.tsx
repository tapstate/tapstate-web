import { cn } from '@tapstate-web/ui/cn'
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
  const iconBackground =
    definition.value === 'wizard'
      ? 'bg-components-icon-bg-indigo-solid'
      : 'bg-components-icon-bg-blue-light-solid'

  return (
    <button
      type="button"
      className={cn(
        'border-components-option-card-option-border bg-components-panel-on-panel-item-bg focus-visible:ring-state-accent-solid relative box-content h-21 w-47.75 cursor-pointer rounded-xl border-[0.5px] p-3 text-left shadow-xs outline-hidden hover:shadow-md focus-visible:ring-2',
        selected &&
          'outline-components-option-card-option-selected-border shadow-md outline-[1.5px] outline-solid',
      )}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span
        className={cn('flex size-6 items-center justify-center rounded-md', iconBackground)}
        aria-hidden="true"
      >
        <Icon className="text-components-avatar-shape-fill-stop-100 size-4" />
      </span>
      <div className="system-sm-semibold text-text-secondary mt-2 mb-0.5">
        {t(definition.labelKey)}
      </div>
      <div
        className="system-xs-regular text-text-tertiary line-clamp-2"
        title={t(definition.descriptionKey)}
      >
        {t(definition.descriptionKey)}
      </div>
    </button>
  )
}
