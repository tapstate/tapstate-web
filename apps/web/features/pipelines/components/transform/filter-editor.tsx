import { GitBranch, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { celFilterField } from '../filter-cel'
import { TransformEditorShell } from './transform-editor-shell'
import { TransformSelect } from './transform-select'
import { mergeBody, type TransformEditorProps } from './types'

interface ConditionRow {
  field: string
  operator: 'equals' | 'notEquals' | 'contains'
  value: string
}

function expressionFor(rows: ConditionRow[], logic: 'all' | 'any') {
  return rows
    .map((row) => {
      const field = row.field.trim()
      const value = row.value.trim()
      if (!field || !value) return null
      const reference = celFilterField(field)
      const escaped = JSON.stringify(value)
      if (row.operator === 'notEquals') return `${reference} != ${escaped}`
      if (row.operator === 'contains') return `${reference}.contains(${escaped})`
      return `${reference} == ${escaped}`
    })
    .filter((value): value is string => value !== null)
    .join(logic === 'all' ? ' && ' : ' || ')
}

function parseExpression(value: unknown): ConditionRow[] {
  if (typeof value !== 'string' || value.trim() === '') {
    return [{ field: '', operator: 'equals', value: '' }]
  }
  const rows = value
    .split(/\s+(?:&&|\|\||AND|OR)\s+/i)
    .map((part) => {
      const contains = part.match(/^(.+?)\.contains\((.*)\)$/)
      if (contains)
        return {
          field: contains[1] ?? '',
          operator: 'contains' as const,
          value: unquote(contains[2] ?? ''),
        }
      const notEquals = part.match(/^(.+?)\s*!=\s*(.*)$/)
      if (notEquals)
        return {
          field: notEquals[1] ?? '',
          operator: 'notEquals' as const,
          value: unquote(notEquals[2] ?? ''),
        }
      const equals = part.match(/^(.+?)\s*==\s*(.*)$/)
      if (equals)
        return {
          field: equals[1] ?? '',
          operator: 'equals' as const,
          value: unquote(equals[2] ?? ''),
        }
      return null
    })
    .filter((row): row is ConditionRow => row !== null)
  return rows.length > 0 ? rows : [{ field: '', operator: 'equals', value: '' }]
}

function unquote(value: string) {
  try {
    const parsed: unknown = JSON.parse(value)
    return typeof parsed === 'string' ? parsed : value
  } catch {
    return value.replace(/^['"]|['"]$/g, '')
  }
}

export function FilterEditor({ config, onChange }: TransformEditorProps) {
  const { t } = useTranslation()
  const initialExpression = typeof config.body.expr === 'string' ? config.body.expr : ''
  const [rows, setRows] = useState(() => parseExpression(initialExpression))
  const [logic, setLogic] = useState<'all' | 'any'>(() =>
    /\s(?:OR|\|\|)\s/i.test(initialExpression) ? 'any' : 'all',
  )
  const expression = useMemo(() => expressionFor(rows, logic), [logic, rows])
  const configurationKey = JSON.stringify({ expr: config.body.expr })

  useEffect(() => {
    const nextExpression = typeof config.body.expr === 'string' ? config.body.expr : ''
    setRows(parseExpression(nextExpression))
    setLogic(/\s(?:OR|\|\|)\s/i.test(nextExpression) ? 'any' : 'all')
  }, [configurationKey])

  function updateRows(nextRows: ConditionRow[]) {
    setRows(nextRows)
    onChange?.({ body: mergeBody(config, { expr: expressionFor(nextRows, logic) }) })
  }

  function updateLogic(nextLogic: 'all' | 'any') {
    setLogic(nextLogic)
    onChange?.({ body: mergeBody(config, { expr: expressionFor(rows, nextLogic) }) })
  }

  return (
    <TransformEditorShell
      from={config.from}
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
        {rows.map((row, index) => (
          <div key={`${index}-${row.field}`} className="pipeline-transform__condition">
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
            <TransformSelect
              label={t('pipelines.workspace.transform.operator')}
              value={row.operator}
              options={[
                { value: 'equals', label: '=' },
                { value: 'notEquals', label: '≠' },
                {
                  value: 'contains',
                  label: t('pipelines.workspace.transform.containsOperator'),
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
                    itemIndex === index ? { ...item, value: event.target.value } : item,
                  ),
                )
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t('pipelines.workspace.transform.removeCondition')}
              onClick={() => {
                const nextRows = rows.filter((_, itemIndex) => itemIndex !== index)
                updateRows(
                  nextRows.length > 0 ? nextRows : [{ field: '', operator: 'equals', value: '' }],
                )
              }}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit gap-1.5"
        onClick={() => updateRows([...rows, { field: '', operator: 'equals', value: '' }])}
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
