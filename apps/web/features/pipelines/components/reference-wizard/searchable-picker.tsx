import type { ReactNode } from 'react'

import {
  Autocomplete,
  AutocompleteEmpty,
  AutocompleteInput,
  AutocompleteInputGroup,
  AutocompleteItem,
  AutocompleteList,
  AutocompletePopup,
  AutocompletePortal,
  AutocompletePositioner,
  AutocompleteTrigger,
} from '@tapstate-web/ui/autocomplete'
import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxInputTrigger,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxPortal,
  ComboboxPositioner,
  createComboboxItems,
} from '@tapstate-web/ui/combobox'
import { useEffect, useMemo, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

export interface SearchablePickerOption {
  value: string
  label: string
  icon?: ReactNode
  detail?: string
  isPrimaryKey?: boolean
}

function SearchablePickerOptionRow({ option }: { option: SearchablePickerOption }) {
  return (
    <span
      className={cn(
        'grid w-full min-w-0 items-center gap-2',
        option.detail ? 'grid-cols-[minmax(0,1fr)_minmax(0,32%)]' : 'grid-cols-1',
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        {option.icon}
        <span className="system-sm-medium min-w-0 flex-1 truncate" title={option.label}>
          {option.label}
        </span>
        {option.isPrimaryKey ? (
          <span className="border-components-panel-border text-text-tertiary shrink-0 rounded border px-1 text-[9px] font-medium">
            PK
          </span>
        ) : null}
      </span>
      {option.detail ? (
        <span
          className="system-xs-regular text-text-tertiary min-w-0 truncate text-right"
          title={option.detail}
        >
          {option.detail}
        </span>
      ) : null}
    </span>
  )
}

type SearchOption = string | SearchablePickerOption

function normalizeOptions(options: readonly SearchOption[]): SearchablePickerOption[] {
  return options.map((option) =>
    typeof option === 'string' ? { value: option, label: option } : option,
  )
}

export function mergeFieldOptions(
  ...groups: readonly (readonly SearchablePickerOption[])[]
): SearchablePickerOption[] {
  const merged = new Map<string, SearchablePickerOption>()
  for (const option of groups.flat()) {
    const previous = merged.get(option.value)
    if (!previous) {
      merged.set(option.value, option)
      continue
    }
    const details = new Set([previous.detail, option.detail].filter(Boolean))
    merged.set(option.value, {
      ...previous,
      detail: details.size > 0 ? [...details].join(' / ') : undefined,
      isPrimaryKey: previous.isPrimaryKey && option.isPrimaryKey,
    })
  }
  return [...merged.values()]
}

export function SearchablePicker({
  ariaLabel,
  emptyLabel,
  className,
  inputClassName,
  onValueChange,
  openLabel,
  options: rawOptions,
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
  options: readonly SearchOption[]
  placeholder: string
  renderOption?: (option: SearchablePickerOption) => ReactNode
  renderSelectedLeading?: (option: SearchablePickerOption | undefined) => ReactNode
  value: string
}) {
  const options = useMemo(() => normalizeOptions(rawOptions), [rawOptions])
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
                  {renderOption?.(option) ?? <SearchablePickerOptionRow option={option} />}
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
  options: rawOptions,
  placeholder,
  value,
}: {
  ariaLabel: string
  className?: string
  emptyLabel: string
  inputClassName?: string
  onValueChange: (value: string) => void
  openLabel: string
  options: readonly SearchOption[]
  placeholder: string
  value: string
}) {
  const options = useMemo(() => normalizeOptions(rawOptions), [rawOptions])
  const values = useMemo(() => options.map((option) => option.value), [options])
  const [open, setOpen] = useState(false)
  const [searchActive, setSearchActive] = useState(false)
  const [query, setQuery] = useState(value)
  const openRef = useRef(open)
  const latestValueRef = useRef(value)
  const inputChangedWhileClosedRef = useRef(false)

  useEffect(() => {
    latestValueRef.current = value
    if (!open) setQuery(value)
  }, [open, value])

  return (
    <Autocomplete<string>
      items={values}
      filteredItems={open && !searchActive ? values : undefined}
      open={open}
      openOnInputClick
      value={query}
      onOpenChange={(nextOpen, eventDetails) => {
        openRef.current = nextOpen
        setOpen(nextOpen)
        if (nextOpen) {
          const preserveTypedQuery =
            eventDetails.reason === 'input-change' && inputChangedWhileClosedRef.current
          if (preserveTypedQuery) {
            setSearchActive(true)
          } else {
            setQuery(value)
            setSearchActive(false)
          }
          inputChangedWhileClosedRef.current = false
        } else {
          setQuery(latestValueRef.current)
          setSearchActive(false)
          inputChangedWhileClosedRef.current = false
        }
      }}
      onValueChange={(nextValue) => {
        const nextQuery = nextValue ?? ''
        if (!openRef.current && nextQuery !== latestValueRef.current) {
          inputChangedWhileClosedRef.current = true
        } else if (openRef.current && nextQuery !== latestValueRef.current) {
          setSearchActive(true)
        }
        latestValueRef.current = nextQuery
        setQuery(nextQuery)
        onValueChange(nextQuery)
      }}
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
              {(value) => {
                const option = options.find((candidate) => candidate.value === value) ?? {
                  value,
                  label: value,
                }
                return (
                  <AutocompleteItem key={value} value={value}>
                    <SearchablePickerOptionRow option={option} />
                  </AutocompleteItem>
                )
              }}
            </AutocompleteList>
          </AutocompletePopup>
        </AutocompletePositioner>
      </AutocompletePortal>
    </Autocomplete>
  )
}
