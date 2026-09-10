import { AutoComplete } from 'antd'
import { ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { PipelineSchemaOption } from './pipeline-data-node-schema'

export interface PipelineTableAutocompleteProps {
  options?: readonly PipelineSchemaOption[]
  value?: string
  onChange?: (value: string) => void
  disabled?: boolean
  allowClear?: boolean
  'aria-label'?: string
}

/**
 * Ant Design v6's free-form autocomplete keeps Target table editing inside
 * the same Formily/Antd control family as the rest of the inspector.
 */
export function PipelineTableAutocomplete({
  options = [],
  value = '',
  onChange,
  disabled,
  allowClear = true,
  'aria-label': ariaLabel,
}: PipelineTableAutocompleteProps) {
  const { t } = useTranslation()
  const items = options.filter((option) => option.value.trim().length > 0)

  return (
    <AutoComplete
      aria-label={ariaLabel}
      className="pipeline-table-autocomplete"
      value={value}
      options={items}
      onChange={onChange}
      disabled={disabled}
      allowClear={allowClear}
      suffixIcon={<ChevronDown aria-hidden="true" />}
      popupMatchSelectWidth
      notFoundContent={t('pipelines.workspace.config.noTableOptions')}
      classNames={{
        popup: {
          root: 'pipeline-table-autocomplete__popup',
        },
      }}
      placeholder={t('pipelines.workspace.config.targetTablePlaceholder')}
    />
  )
}
