import { Input, Select } from 'antd'
import { Braces, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

import { TransformEditorShell } from './transform-editor-shell'
import { mergeBody, type TransformEditorProps } from './types'

type MapMode = 'reference' | 'drop' | 'expression' | 'literal'
type MapEntry = { target: string; mode: MapMode; value: string }

function initialEntry(target: string, value: unknown): MapEntry {
  if (value === false) return { target, mode: 'drop', value: '' }
  if (typeof value === 'string' && value.startsWith('$'))
    return { target, mode: 'reference', value: value.slice(1) }
  if (typeof value === 'string' && value.startsWith('='))
    return { target, mode: 'expression', value: value.slice(1) }
  return {
    target,
    mode: 'literal',
    value: typeof value === 'string' ? value : value == null ? '' : JSON.stringify(value),
  }
}

function initialEntries(fields: Record<string, unknown> | undefined): MapEntry[] {
  const entries = Object.entries(fields ?? {})
  return entries.length > 0
    ? entries.map(([target, value]) => initialEntry(target, value))
    : [{ target: '', mode: 'reference', value: '' }]
}

function mapValue(entry: MapEntry): unknown {
  if (entry.mode === 'drop') return false
  if (entry.mode === 'reference') return '$' + entry.value.trim()
  if (entry.mode === 'expression') return '=' + entry.value.trim()
  return entry.value
}

function fieldsFor(entries: MapEntry[]) {
  return Object.fromEntries(
    entries
      .filter((entry) => entry.target.trim())
      .map((entry) => [entry.target.trim(), mapValue(entry)]),
  )
}

export function MapEditor({ config, onChange }: TransformEditorProps) {
  const { t } = useTranslation()
  const [entries, setEntries] = useState(() =>
    initialEntries(config.body.fields as Record<string, unknown> | undefined),
  )
  const configurationKey = JSON.stringify({ fields: config.body.fields })

  useEffect(() => {
    setEntries(initialEntries(config.body.fields as Record<string, unknown> | undefined))
  }, [configurationKey])

  function update(nextEntries: MapEntry[]) {
    setEntries(nextEntries)
    onChange?.({ body: mergeBody(config, { fields: fieldsFor(nextEntries) }) })
  }

  return (
    <TransformEditorShell
      from={config.from}
      icon={Braces}
      title={t('pipelines.workspace.transform.map.title')}
      description={t('pipelines.workspace.transform.map.description')}
    >
      <div className="pipeline-transform__mapping-list">
        {entries.map((entry, index) => (
          <div key={index + '-' + entry.target} className="pipeline-transform__mapping">
            <Input
              aria-label={t('pipelines.workspace.transform.targetField')}
              value={entry.target}
              placeholder={t('pipelines.workspace.transform.targetField')}
              onChange={(event) =>
                update(
                  entries.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, target: event.target.value } : item,
                  ),
                )
              }
            />
            <Select
              aria-label={t('pipelines.workspace.transform.mappingMode')}
              value={entry.mode}
              options={[
                { value: 'reference', label: t('pipelines.workspace.transform.referenceMode') },
                { value: 'drop', label: t('pipelines.workspace.transform.dropMode') },
                { value: 'expression', label: t('pipelines.workspace.transform.expressionMode') },
                { value: 'literal', label: t('pipelines.workspace.transform.literalMode') },
              ]}
              onChange={(mode: MapMode) =>
                update(
                  entries.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, mode, value: mode === 'drop' ? '' : item.value }
                      : item,
                  ),
                )
              }
            />
            <Input
              aria-label={t('pipelines.workspace.transform.sourceField')}
              value={entry.mode === 'drop' ? '' : entry.value}
              disabled={entry.mode === 'drop'}
              placeholder={
                entry.mode === 'drop'
                  ? t('pipelines.workspace.transform.dropValue')
                  : t('pipelines.workspace.transform.sourceField')
              }
              onChange={(event) =>
                update(
                  entries.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, value: event.target.value } : item,
                  ),
                )
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t('pipelines.workspace.transform.removeMapping')}
              onClick={() => {
                const nextEntries = entries.filter((_, itemIndex) => itemIndex !== index)
                update(
                  nextEntries.length > 0
                    ? nextEntries
                    : [{ target: '', mode: 'reference', value: '' }],
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
        onClick={() => update([...entries, { target: '', mode: 'reference', value: '' }])}
      >
        <Plus className="size-3.5" />
        {t('pipelines.workspace.transform.addMapping')}
      </Button>
    </TransformEditorShell>
  )
}
