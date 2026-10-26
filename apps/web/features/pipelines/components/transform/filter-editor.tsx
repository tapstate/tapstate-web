import { Button } from '@tapstate-web/ui/button'
import { Input } from '@tapstate-web/ui/input'
import { GitBranch, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  celFilterField,
  celFilterFieldKind,
  celFilterFieldType,
  celFilterLiteral,
  type FilterLiteralKind,
} from '../filter-cel'
import {
  SearchablePicker,
  type SearchablePickerOption,
} from '../reference-wizard/searchable-picker'
import { TransformEditorShell } from './transform-editor-shell'
import { TransformSelect } from './transform-select'
import { mergeBody, type TransformEditorProps } from './types'

interface ConditionRow {
  field: string
  operator: 'equals' | 'notEquals' | 'contains'
  value: string
  literalKind: FilterLiteralKind
}

function expressionFor(
  rows: ConditionRow[],
  logic: 'all' | 'any',
  fieldTypes?: Readonly<Record<string, string>>,
) {
  return rows
    .map((row) => {
      const field = row.field.trim()
      const value = row.value.trim()
      if (!field || !value) return null
      const reference = celFilterField(field)
      const escaped = celFilterLiteral(
        value,
        celFilterFieldType(field, fieldTypes),
        row.literalKind,
        row.operator === 'contains',
      )
      if (row.operator === 'notEquals') return `${reference} != ${escaped}`
      if (row.operator === 'contains') return `${reference}.contains(${escaped})`
      return `${reference} == ${escaped}`
    })
    .filter((value): value is string => value !== null)
    .join(logic === 'all' ? ' && ' : ' || ')
}

function parseExpression(value: unknown): ConditionRow[] {
  if (typeof value !== 'string' || value.trim() === '') {
    return [{ field: '', operator: 'equals', value: '', literalKind: 'auto' }]
  }
  const rows = value
    .split(/\s+(?:&&|\|\||AND|OR)\s+/i)
    .map((part) => {
      const contains = part.match(/^(.+?)\.contains\((.*)\)$/)
      if (contains) return conditionRow(contains[1] ?? '', 'contains', contains[2] ?? '')
      const notEquals = part.match(/^(.+?)\s*!=\s*(.*)$/)
      if (notEquals) return conditionRow(notEquals[1] ?? '', 'notEquals', notEquals[2] ?? '')
      const equals = part.match(/^(.+?)\s*==\s*(.*)$/)
      if (equals) return conditionRow(equals[1] ?? '', 'equals', equals[2] ?? '')
      return null
    })
    .filter((row): row is ConditionRow => row !== null)
  return rows.length > 0
    ? rows
    : [{ field: '', operator: 'equals', value: '', literalKind: 'auto' }]
}

function conditionRow(
  field: string,
  operator: ConditionRow['operator'],
  token: string,
): ConditionRow {
  const parsed = parseLiteral(token)
  return { field, operator, value: parsed.value, literalKind: parsed.kind }
}

function parseLiteral(value: string): { value: string; kind: FilterLiteralKind } {
  try {
    const parsed: unknown = JSON.parse(value)
    if (typeof parsed === 'string') return { value: parsed, kind: 'string' }
    if (typeof parsed === 'number') return { value: value.trim(), kind: 'number' }
    if (typeof parsed === 'boolean') return { value: String(parsed), kind: 'boolean' }
    if (parsed === null) return { value: 'null', kind: 'null' }
  } catch {
    // Existing CEL may use single-quoted strings, which JSON.parse does not accept.
  }
  return { value: value.replace(/^['"]|['"]$/g, ''), kind: 'string' }
}

export function FilterEditor({
  config,
  onChange,
  fieldTypes,
  upstreamInputs,
}: TransformEditorProps) {
  const { t } = useTranslation()
  const initialExpression = typeof config.body.expr === 'string' ? config.body.expr : ''
  const [rows, setRows] = useState(() => parseExpression(initialExpression))
  const [logic, setLogic] = useState<'all' | 'any'>(() =>
    /\s(?:OR|\|\|)\s/i.test(initialExpression) ? 'any' : 'all',
  )
  const expression = useMemo(
    () => expressionFor(rows, logic, fieldTypes),
    [fieldTypes, logic, rows],
  )
  const configurationKey = JSON.stringify({ expr: config.body.expr })

  useEffect(() => {
    const nextExpression = typeof config.body.expr === 'string' ? config.body.expr : ''
    setRows(parseExpression(nextExpression))
    setLogic(/\s(?:OR|\|\|)\s/i.test(nextExpression) ? 'any' : 'all')
  }, [configurationKey])

  function updateRows(nextRows: ConditionRow[]) {
    setRows(nextRows)
    onChange?.({ body: mergeBody(config, { expr: expressionFor(nextRows, logic, fieldTypes) }) })
  }

  function updateLogic(nextLogic: 'all' | 'any') {
    setLogic(nextLogic)
    onChange?.({ body: mergeBody(config, { expr: expressionFor(rows, nextLogic, fieldTypes) }) })
  }

  useEffect(() => {
    if (!onChange || !initialExpression || expression === initialExpression) return
    const hasKnownFieldType = rows.some((row) => celFilterFieldType(row.field, fieldTypes))
    if (!hasKnownFieldType) return
    onChange({ body: mergeBody(config, { expr: expression }) })
  }, [config, expression, fieldTypes, initialExpression, onChange, rows])

  return (
    <TransformEditorShell
      from={upstreamInputs ?? config.from}
      icon={GitBranch}
      title={t('pipelines.workspace.transform.filter.title')}
    >
      <div className="pipeline-transform__toolbar">
        <span className="pipeline-transform__toolbar-label">
          {t('pipelines.workspace.transform.logic')}
        </span>
        <TransformSelect
          label={t('pipelines.workspace.transform.logic')}
          value={logic}
          options={[
            { value: 'all', label: t('pipelines.workspace.transform.all') },
            { value: 'any', label: t('pipelines.workspace.transform.any') },
          ]}
          onChange={(value) => updateLogic(value as 'all' | 'any')}
        />
      </div>
      <div className="pipeline-transform__conditions">
        {rows.map((row, index) => {
          const fieldType = celFilterFieldType(row.field, fieldTypes)
          const fieldKind = celFilterFieldKind(fieldType)
          const containsSupported = fieldKind === 'string'
          const hasFieldSchema = Object.keys(fieldTypes ?? {}).length > 0
          const isKnownEnvelopeField = ['op', 'ts', 'src'].includes(row.field)
          const fieldOptions: SearchablePickerOption[] = [
            ...Object.entries(fieldTypes ?? {}).map(([field, type]) => ({
              value: field,
              label: field,
              detail: type || undefined,
            })),
            {
              value: 'op',
              label: 'op',
              detail: t('pipelines.workspace.transform.wizard.operationType'),
            },
            {
              value: 'ts',
              label: 'ts',
              detail: t('pipelines.workspace.transform.wizard.eventTimestamp'),
            },
            {
              value: 'src',
              label: 'src',
              detail: t('pipelines.workspace.transform.wizard.sourceMetadata'),
            },
          ].filter(
            (option, optionIndex, options) =>
              options.findIndex((candidate) => candidate.value === option.value) === optionIndex,
          )
          if (row.field && !fieldOptions.some((option) => option.value === row.field)) {
            fieldOptions.unshift({ value: row.field, label: row.field })
          }

          return (
            <div key={`${index}-${row.field}`}>
              <div className="pipeline-transform__condition">
                {hasFieldSchema || isKnownEnvelopeField ? (
                  <SearchablePicker
                    ariaLabel={t('pipelines.workspace.transform.field')}
                    emptyLabel={t('pipelines.workspace.transform.wizard.noFieldMatches')}
                    className="min-w-0 flex-1"
                    onValueChange={(field) =>
                      updateRows(
                        rows.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, field } : item,
                        ),
                      )
                    }
                    openLabel={t('pipelines.workspace.transform.wizard.openFieldPicker')}
                    options={fieldOptions}
                    placeholder={t('pipelines.workspace.transform.field')}
                    value={row.field}
                  />
                ) : (
                  <Input
                    aria-label={t('pipelines.workspace.transform.field')}
                    value={row.field}
                    placeholder={t('pipelines.workspace.transform.field')}
                    onChange={(event) =>
                      updateRows(
                        rows.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, field: event.target.value } : item,
                        ),
                      )
                    }
                  />
                )}
                <TransformSelect
                  label={t('pipelines.workspace.transform.operator')}
                  value={row.operator}
                  options={[
                    { value: 'equals', label: '=' },
                    { value: 'notEquals', label: '≠' },
                    {
                      value: 'contains',
                      label: t('pipelines.workspace.transform.containsOperator'),
                      disabled: !containsSupported,
                    },
                  ]}
                  onChange={(operator) =>
                    updateRows(
                      rows.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, operator } : item,
                      ),
                    )
                  }
                />
                <Input
                  aria-label={t('pipelines.workspace.transform.value')}
                  value={row.value}
                  placeholder={t('pipelines.workspace.transform.value')}
                  onChange={(event) =>
                    updateRows(
                      rows.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, value: event.target.value, literalKind: 'auto' }
                          : item,
                      ),
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="small"
                  className="size-6 p-0"
                  aria-label={t('pipelines.workspace.transform.removeCondition')}
                  onClick={() => {
                    const nextRows = rows.filter((_, itemIndex) => itemIndex !== index)
                    updateRows(
                      nextRows.length > 0
                        ? nextRows
                        : [{ field: '', operator: 'equals', value: '', literalKind: 'auto' }],
                    )
                  }}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
              {row.operator === 'contains' && !containsSupported && (
                <p className="text-destructive mt-1 text-xs" role="alert">
                  {t('pipelines.workspace.transform.containsTextOnly')}
                </p>
              )}
            </div>
          )
        })}
      </div>
      <Button
        type="button"
        variant="secondary"
        size="small"
        className="w-fit gap-1.5"
        onClick={() =>
          updateRows([...rows, { field: '', operator: 'equals', value: '', literalKind: 'auto' }])
        }
      >
        <Plus className="size-3.5" />
        {t('pipelines.workspace.transform.addCondition')}
      </Button>
      <div className="pipeline-transform__preview">
        <span>{t('pipelines.workspace.transform.expression')}</span>
        <code>
          {expression || initialExpression || t('pipelines.workspace.transform.expressionEmpty')}
        </code>
      </div>
    </TransformEditorShell>
  )
}
