import { Button } from '@tapstate-web/ui/button'
import {
  Combobox,
  ComboboxChip,
  ComboboxChipRemove,
  ComboboxChips,
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
  ComboboxValue,
} from '@tapstate-web/ui/combobox'
import { IconButton } from '@tapstate-web/ui/icon-button'
import { Input } from '@tapstate-web/ui/input'
import { ArrowRight, ArrowRightLeft, Calculator, Info, Layers, Minus, Plus, X } from 'lucide-react'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

import type { MapFieldRule, MapTransformConfig } from './TableTransformsManager'

import { SearchablePicker, type SearchablePickerOption } from './searchable-picker'

type Operation = MapFieldRule['ruleType']
const operations = ['delete', 'literal', 'rename', 'compute'] as const
const meta = {
  delete: { icon: Minus, color: 'text-text-destructive', label: 'delete' },
  literal: { icon: Plus, color: 'text-text-success', label: 'add' },
  rename: { icon: ArrowRightLeft, color: 'text-util-colors-blue-blue-600', label: 'rename' },
  compute: { icon: Calculator, color: 'text-util-colors-orange-orange-600', label: 'compute' },
} as const

function completeRules(rules: MapFieldRule[]) {
  return rules.filter(
    (rule) =>
      rule.outputField.trim() &&
      (rule.ruleType === 'delete' ||
        (rule.ruleType === 'literal' && rule.valueConfigured !== false) ||
        (rule.ruleType === 'rename'
          ? rule.value.replace(/^\$/, '').trim()
          : rule.value.replace(/^=/, '').trim())),
  )
}

export function MapOperationsEditor({
  config,
  columns,
  fieldOptions = [],
  onChange,
}: {
  config: MapTransformConfig
  columns: string[]
  fieldOptions?: SearchablePickerOption[]
  onChange: (value: MapTransformConfig) => void
}) {
  const { t } = useTranslation()
  const copy = (key: string) => t(`pipelines.workspace.transform.wizard.mapOperations.${key}`)
  const rules = config.draftFields ?? config.fields
  const active = config.operationOrder ?? [...new Set(rules.map((rule) => rule.ruleType))]
  const host = useRef<HTMLDivElement>(null)

  const duplicates = (items: MapFieldRule[]) => {
    const names = completeRules(items).map((rule) => rule.outputField.trim())
    return names.filter((name, index) => names.indexOf(name) !== index)
  }
  function update(next: MapFieldRule[], order = active) {
    onChange({
      ...config,
      fields: duplicates(next).length ? config.fields : completeRules(next),
      draftFields: next,
      operationOrder: order,
    })
  }
  function focus(kind: Operation, last = false) {
    requestAnimationFrame(() => {
      const inputs = host.current?.querySelectorAll<HTMLInputElement>(
        `[data-map-operation="${kind}"] input`,
      )
      const input = last ? inputs?.[Math.max(0, (inputs?.length ?? 0) - 2)] : inputs?.[0]
      input?.focus()
    })
  }
  function append(kind: Operation) {
    const order = active.includes(kind) ? active : [...active, kind]
    const next =
      kind === 'delete'
        ? rules
        : [
            ...rules,
            {
              id: crypto.randomUUID(),
              ruleType: kind,
              outputField: '',
              value: '',
              valueConfigured: false,
            },
          ]
    update(next, order)
    focus(kind, kind !== 'delete')
  }
  const patch = (id: string, value: Partial<MapFieldRule>) =>
    update(rules.map((rule) => (rule.id === id ? { ...rule, ...value } : rule)))
  const selected = rules
    .filter((rule) => rule.ruleType === 'delete')
    .map((rule) => rule.outputField)
  const choices = [...new Set([...columns, ...selected])]
  const conflictingNames = duplicates(rules)

  return (
    <div
      ref={host}
      className="wizard-map-operations space-y-3 rounded-xl border border-blue-200/70 bg-blue-50/30 p-3.5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-blue-600" />
          <span className="text-[12px] font-semibold text-blue-950">
            {t('pipelines.workspace.transform.wizard.mapRules')}
          </span>
        </div>
        <span className="rounded-lg border border-blue-200 bg-blue-100/70 px-2 py-0.5 text-[11px] text-blue-700">
          {copy('operations')}
        </span>
      </div>
      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-2.5 text-[11px] text-blue-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
        <div className="space-y-1">
          <p className="font-medium">
            💡 {t('pipelines.workspace.transform.wizard.passthroughSummary')}
          </p>
          <p className="text-blue-700">{copy('hint')}</p>
        </div>
      </div>
      <div className="wizard-map-actions" aria-label={copy('operations')}>
        {operations.map((kind) => {
          const item = meta[kind]
          const Icon = item.icon
          const count = rules.filter((rule) => rule.ruleType === kind).length
          return (
            <Button
              key={kind}
              type="button"
              variant="secondary"
              size="small"
              className="h-auto min-h-6 min-w-0 gap-1.5 whitespace-normal"
              onClick={() => append(kind)}
            >
              <Icon aria-hidden="true" className={`size-3.5 shrink-0 ${item.color}`} />
              {copy(item.label)}
              {count > 0 && (
                <span className="system-2xs-regular text-text-tertiary bg-state-base-hover rounded px-1 tabular-nums">
                  {count}
                </span>
              )}
            </Button>
          )
        })}
      </div>
      {active.map((kind) => {
        const item = meta[kind]
        const Icon = item.icon
        const entries = rules.filter((rule) => rule.ruleType === kind)
        return (
          <section
            key={kind}
            data-map-operation={kind}
            aria-label={copy(item.label)}
            className="overflow-hidden rounded-lg border border-blue-200 bg-white shadow-2xs"
          >
            <div className="flex min-h-8 items-center gap-1.5 border-b border-gray-100 px-2.5 py-1">
              <Icon aria-hidden="true" className={`size-3.5 shrink-0 ${item.color}`} />
              <h4 className="system-xs-medium text-text-secondary">{copy(item.label)}</h4>
              <span className="system-2xs-regular text-text-tertiary tabular-nums">
                {entries.length}
              </span>
              <div className="ml-auto flex items-center gap-1">
                {kind !== 'delete' && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="small"
                    className="h-6 gap-1"
                    onClick={() => append(kind)}
                    aria-label={`${copy('append')} ${copy(item.label)}`}
                  >
                    <Plus className="size-3" />
                    <span className="wizard-map-append-label">{copy('append')}</span>
                  </Button>
                )}
                <IconButton
                  type="button"
                  size="md"
                  tone="destructive"
                  aria-label={`${copy('removeOperation')} ${copy(item.label)}`}
                  onClick={() => {
                    update(
                      rules.filter((rule) => rule.ruleType !== kind),
                      active.filter((value) => value !== kind),
                    )
                  }}
                >
                  <X className="size-3.5" />
                </IconButton>
              </div>
            </div>
            <div className="space-y-2 p-2.5">
              {kind === 'delete' ? (
                <Combobox<string, true>
                  multiple
                  items={choices}
                  value={selected}
                  onValueChange={(values) => {
                    const retained = rules.filter(
                      (rule) => rule.ruleType !== 'delete' || values.includes(rule.outputField),
                    )
                    update([
                      ...retained,
                      ...values
                        .filter((field) => !selected.includes(field))
                        .map((field) => ({
                          id: crypto.randomUUID(),
                          outputField: field,
                          ruleType: 'delete' as const,
                          value: 'false',
                        })),
                    ])
                  }}
                >
                  <ComboboxInputGroup className="w-full py-1">
                    <ComboboxChips>
                      <ComboboxValue<string, true>>
                        {(values) =>
                          values?.map((field) => (
                            <ComboboxChip key={field}>
                              {field}
                              <ComboboxChipRemove aria-label={`${copy('removeField')} ${field}`} />
                            </ComboboxChip>
                          ))
                        }
                      </ComboboxValue>
                      <ComboboxInput
                        aria-label={copy('delete')}
                        placeholder={copy('selectFields')}
                        className="min-w-32"
                      />
                    </ComboboxChips>
                    <ComboboxInputTrigger
                      aria-label={t('pipelines.workspace.transform.wizard.openFieldPicker')}
                    />
                  </ComboboxInputGroup>
                  <ComboboxPortal>
                    <ComboboxPositioner>
                      <ComboboxPopup>
                        <ComboboxEmpty>
                          {t('pipelines.workspace.transform.wizard.noFieldMatches')}
                        </ComboboxEmpty>
                        <ComboboxList<string>>
                          {(field) => {
                            const option = fieldOptions.find(
                              (candidate) => candidate.value === field,
                            )
                            return (
                              <ComboboxItem key={field} value={field}>
                                <span className="flex w-full min-w-0 items-center gap-2">
                                  <ComboboxItemText
                                    className="min-w-0 flex-1 truncate"
                                    title={option?.label ?? field}
                                  >
                                    {option?.label ?? field}
                                  </ComboboxItemText>
                                  {option?.isPrimaryKey && (
                                    <span className="border-components-panel-border text-text-tertiary shrink-0 rounded border px-1 text-[9px] font-medium">
                                      PK
                                    </span>
                                  )}
                                  {option?.detail && (
                                    <span
                                      className="system-xs-regular text-text-tertiary max-w-[42%] min-w-0 truncate text-right"
                                      title={option.detail}
                                    >
                                      {option.detail}
                                    </span>
                                  )}
                                </span>
                              </ComboboxItem>
                            )
                          }}
                        </ComboboxList>
                      </ComboboxPopup>
                    </ComboboxPositioner>
                  </ComboboxPortal>
                </Combobox>
              ) : (
                <>
                  <div className="wizard-map-operation-labels text-[10px] text-gray-500">
                    <span>
                      {kind === 'rename'
                        ? copy('sourceField')
                        : t('pipelines.workspace.transform.wizard.outputField')}
                    </span>
                    <span />
                    <span>
                      {kind === 'rename'
                        ? copy('newName')
                        : kind === 'literal'
                          ? copy('fixedValue')
                          : copy('expression')}
                    </span>
                    <span />
                  </div>
                  {entries.map((rule) => (
                    <div key={rule.id} className="wizard-map-operation-row">
                      <div className="wizard-map-source min-w-0">
                        <span className="wizard-map-mobile-label">
                          {kind === 'rename'
                            ? copy('sourceField')
                            : t('pipelines.workspace.transform.wizard.outputField')}
                        </span>
                        {kind === 'rename' ? (
                          <SearchablePicker
                            ariaLabel={copy('sourceField')}
                            emptyLabel={t('pipelines.workspace.transform.wizard.noFieldMatches')}
                            options={[
                              ...new Set([
                                ...columns,
                                ...(rule.value ? [rule.value.replace(/^\$/, '')] : []),
                              ]),
                            ].map(
                              (field) =>
                                fieldOptions.find((option) => option.value === field) ?? {
                                  value: field,
                                  label: field,
                                },
                            )}
                            placeholder={copy('sourceField')}
                            openLabel={t('pipelines.workspace.transform.wizard.openFieldPicker')}
                            value={rule.value.replace(/^\$/, '')}
                            onValueChange={(field) => patch(rule.id, { value: `$${field}` })}
                          />
                        ) : (
                          <Input
                            aria-label={t('pipelines.workspace.transform.wizard.outputField')}
                            value={rule.outputField}
                            onChange={(event) =>
                              patch(rule.id, { outputField: event.target.value })
                            }
                            placeholder={t('pipelines.workspace.transform.wizard.outputField')}
                            className="min-w-0 font-mono"
                          />
                        )}
                      </div>
                      <span className="wizard-map-relation">
                        {kind === 'rename' ? (
                          <ArrowRight aria-hidden="true" className="size-3.5 text-gray-400" />
                        ) : (
                          <span aria-hidden="true" className="text-center text-gray-400">
                            =
                          </span>
                        )}
                      </span>
                      <div className="wizard-map-value min-w-0">
                        <span className="wizard-map-mobile-label">
                          {kind === 'rename'
                            ? copy('newName')
                            : kind === 'literal'
                              ? copy('fixedValue')
                              : copy('expression')}
                        </span>
                        <Input
                          aria-label={
                            kind === 'rename'
                              ? copy('newName')
                              : t('pipelines.workspace.transform.wizard.ruleValue')
                          }
                          value={
                            kind === 'rename'
                              ? rule.outputField
                              : kind === 'compute'
                                ? rule.value.replace(/^=/, '')
                                : rule.value
                          }
                          onChange={(event) =>
                            patch(
                              rule.id,
                              kind === 'rename'
                                ? { outputField: event.target.value }
                                : {
                                    valueConfigured: true,
                                    value:
                                      kind === 'compute'
                                        ? `=${event.target.value}`
                                        : event.target.value,
                                  },
                            )
                          }
                          placeholder={
                            kind === 'rename'
                              ? copy('newName')
                              : kind === 'literal'
                                ? t('pipelines.workspace.transform.wizard.literalValuePlaceholder')
                                : 'after.first_name + " " + after.last_name'
                          }
                          className="min-w-0 font-mono"
                        />
                      </div>
                      <IconButton
                        className="wizard-map-remove"
                        type="button"
                        size="md"
                        tone="destructive"
                        aria-label={t('pipelines.workspace.transform.wizard.removeRule')}
                        onClick={() => update(rules.filter((entry) => entry.id !== rule.id))}
                      >
                        <X className="size-3.5" />
                      </IconButton>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="small"
                    className="text-text-tertiary h-6 gap-1"
                    onClick={() => append(kind)}
                  >
                    <Plus className="size-3" />
                    {copy(`another${item.label[0].toUpperCase()}${item.label.slice(1)}`)}
                  </Button>
                </>
              )}
            </div>
          </section>
        )
      })}
      {conflictingNames.length > 0 && (
        <p className="text-text-destructive text-xs" role="alert">
          {t('pipelines.workspace.transform.wizard.mapOperations.duplicateField', {
            field: [...new Set(conflictingNames)].join(', '),
          })}
        </p>
      )}
      {active.length > 0 && <p className="text-[10px] text-gray-500">{copy('draftHint')}</p>}
    </div>
  )
}
