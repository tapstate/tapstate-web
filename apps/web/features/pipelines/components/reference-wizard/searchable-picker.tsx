import type { ReactNode } from 'react'

import {
  Autocomplete,
  AutocompleteEmpty,
  AutocompleteInput,
  AutocompleteInputGroup,
  AutocompleteItem,
  AutocompleteItemText,
  AutocompleteList,
  AutocompletePopup,
  AutocompletePortal,
  AutocompletePositioner,
  AutocompleteTrigger,
} from '@langgenius/dify-ui/autocomplete'
import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxInputTrigger,
  ComboboxItem,
  ComboboxItemText,
  ComboboxList,
  ComboboxPopup,
  ComboboxPortal,
  ComboboxPositioner,
  createComboboxItems,
} from '@langgenius/dify-ui/combobox'
import { useMemo } from 'react'

import { cn } from '@/lib/utils'

export interface SearchablePickerOption {
  value: string
  label: string
  icon?: ReactNode
  detail?: string
}

export function SearchablePicker({
  ariaLabel,
  emptyLabel,
  className,
  inputClassName,
  onValueChange,
  openLabel,
  options,
  placeholder,
  renderOption,
  renderSelectedLeading,
  ariaLabelledBy,
  value,
}: {
  ariaLabel: string
  ariaLabelledBy?: string
  emptyLabel: string
  className?: string
  inputClassName?: string
  onValueChange: (value: string) => void
  openLabel: string
  options: readonly SearchablePickerOption[]
  placeholder: string
  renderOption?: (option: SearchablePickerOption) => ReactNode
  renderSelectedLeading?: (option: SearchablePickerOption | undefined) => ReactNode
  value: string
}) {
  const items = useMemo(
    () =>
      createComboboxItems(options, {
        getValue: (option) => option.value,
        getLabel: (option) => option.label,
      }),
    [options],
  )
  const selected = options.find((option) => option.value === value)

  return (
    <Combobox<string, false, SearchablePickerOption>
      items={items}
      value={value || null}
      onValueChange={(nextValue) => onValueChange(nextValue ?? '')}
      disabled={options.length === 0}
    >
      <ComboboxInputGroup className={cn('w-full', className)}>
        {renderSelectedLeading?.(selected)}
        <ComboboxInput
          data-wizard-search-control
          aria-label={ariaLabelledBy ? undefined : ariaLabel}
          aria-labelledby={ariaLabelledBy}
          autoComplete="off"
          className={inputClassName}
          placeholder={placeholder}
        />
        <ComboboxInputTrigger data-wizard-search-trigger aria-label={openLabel} />
      </ComboboxInputGroup>
      <ComboboxPortal>
        <ComboboxPositioner>
          <ComboboxPopup>
            <ComboboxEmpty>{emptyLabel}</ComboboxEmpty>
            <ComboboxList<SearchablePickerOption>>
              {(option) => (
                <ComboboxItem key={option.value} value={option.value}>
                  {renderOption?.(option) ?? (
                    <span className="flex min-w-0 items-center gap-2">
                      {option.icon}
                      <ComboboxItemText>{option.label}</ComboboxItemText>
                      {option.detail ? (
                        <span className="system-xs-regular text-text-tertiary shrink-0">
                          {option.detail}
                        </span>
                      ) : null}
                    </span>
                  )}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxPopup>
        </ComboboxPositioner>
      </ComboboxPortal>
    </Combobox>
  )
}

export function FieldAutocomplete({
  ariaLabel,
  className,
  emptyLabel,
  inputClassName,
  onValueChange,
  openLabel,
  options,
  placeholder,
  value,
}: {
  ariaLabel: string
  className?: string
  emptyLabel: string
  inputClassName?: string
  onValueChange: (value: string) => void
  openLabel: string
  options: readonly string[]
  placeholder: string
  value: string
}) {
  return (
    <Autocomplete<string>
      items={options}
      value={value}
      onValueChange={(nextValue) => onValueChange(nextValue ?? '')}
    >
      <AutocompleteInputGroup className={cn('w-full', className)}>
        <AutocompleteInput
          data-wizard-search-control
          aria-label={ariaLabel}
          autoComplete="off"
          className={inputClassName}
          placeholder={placeholder}
        />
        <AutocompleteTrigger data-wizard-search-trigger aria-label={openLabel} />
      </AutocompleteInputGroup>
      <AutocompletePortal>
        <AutocompletePositioner>
          <AutocompletePopup>
            <AutocompleteEmpty>{emptyLabel}</AutocompleteEmpty>
            <AutocompleteList<string>>
              {(option) => (
                <AutocompleteItem key={option} value={option}>
                  <AutocompleteItemText>{option}</AutocompleteItemText>
                </AutocompleteItem>
              )}
            </AutocompleteList>
          </AutocompletePopup>
        </AutocompletePositioner>
      </AutocompletePortal>
    </Autocomplete>
  )
}
