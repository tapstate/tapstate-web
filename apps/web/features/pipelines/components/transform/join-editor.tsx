import { GitMerge, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

import { TransformEditorShell } from './transform-editor-shell'
import { TransformSelect } from './transform-select'
import { mergeBody, type TransformEditorProps } from './types'

type JoinAlias = { alias: string; input: string }

function initialAliases(value: unknown): JoinAlias[] {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const entries = Object.entries(value)
    if (entries.length > 0)
      return entries.map(([alias, input]) => ({ alias, input: String(input) }))
  }
  if (Array.isArray(value) && value.length > 0)
    return value.map((input, index) => ({ alias: 'input_' + (index + 1), input: String(input) }))
  return [{ alias: '', input: '' }]
}

function fromFor(aliases: JoinAlias[]) {
  return Object.fromEntries(
    aliases
      .filter((entry) => entry.alias.trim() && entry.input.trim())
      .map((entry) => [entry.alias.trim(), entry.input.trim()]),
  )
}

export function JoinEditor({ config, onChange }: TransformEditorProps) {
  const { t } = useTranslation()
  const [aliases, setAliases] = useState(() => initialAliases(config.from))
  const [engine, setEngine] = useState(() =>
    typeof config.body.engine === 'string' ? config.body.engine : 'builtin',
  )
  const [sql, setSql] = useState(() => (typeof config.body.sql === 'string' ? config.body.sql : ''))
  const configurationKey = JSON.stringify({
    from: config.from,
    engine: config.body.engine,
    sql: config.body.sql,
  })

  useEffect(() => {
    setAliases(initialAliases(config.from))
    setEngine(typeof config.body.engine === 'string' ? config.body.engine : 'builtin')
    setSql(typeof config.body.sql === 'string' ? config.body.sql : '')
  }, [configurationKey])

  function update(nextAliases: JoinAlias[], nextEngine = engine, nextSql = sql) {
    setAliases(nextAliases)
    onChange?.({
      from: fromFor(nextAliases),
      body: mergeBody(config, { engine: nextEngine, sql: nextSql }),
    })
  }

  function updateEngine(nextEngine: string) {
    setEngine(nextEngine)
    onChange?.({ from: fromFor(aliases), body: mergeBody(config, { engine: nextEngine, sql }) })
  }

  function updateSql(nextSql: string) {
    setSql(nextSql)
    onChange?.({ from: fromFor(aliases), body: mergeBody(config, { engine, sql: nextSql }) })
  }

  return (
    <TransformEditorShell
      from={config.from}
      icon={GitMerge}
      title={t('pipelines.workspace.transform.join.title')}
    >
      <div className="pipeline-transform__section-heading">
        {t('pipelines.workspace.transform.aliases')}
      </div>
      <div className="pipeline-transform__mapping-list">
        {aliases.map((entry, index) => (
          <div key={index + '-' + entry.alias} className="pipeline-transform__mapping">
            <Input
              aria-label={t('pipelines.workspace.transform.inputAlias')}
              value={entry.alias}
              placeholder={t('pipelines.workspace.transform.inputAlias')}
              onChange={(event) =>
                update(
                  aliases.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, alias: event.target.value } : item,
                  ),
                )
              }
            />
            <Input
              aria-label={t('pipelines.workspace.transform.upstreamInput')}
              value={entry.input}
              placeholder={t('pipelines.workspace.transform.upstreamInput')}
              onChange={(event) =>
                update(
                  aliases.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, input: event.target.value } : item,
                  ),
                )
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t('pipelines.workspace.transform.removeAlias')}
              onClick={() => {
                const nextAliases = aliases.filter((_, itemIndex) => itemIndex !== index)
                update(nextAliases.length > 0 ? nextAliases : [{ alias: '', input: '' }])
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
        onClick={() => update([...aliases, { alias: '', input: '' }])}
      >
        <Plus className="size-3.5" />
        {t('pipelines.workspace.transform.addAlias')}
      </Button>
      <div className="pipeline-transform__two-column">
        <label className="pipeline-transform__field-label">
          {t('pipelines.workspace.transform.engine')}
        </label>
        <TransformSelect
          label={t('pipelines.workspace.transform.engine')}
          value={engine}
          options={[{ value: 'builtin', label: t('pipelines.workspace.transform.builtinEngine') }]}
          onChange={updateEngine}
        />
      </div>
      <Textarea
        aria-label={t('pipelines.workspace.transform.sql')}
        value={sql}
        rows={7}
        placeholder={t('pipelines.workspace.transform.sql')}
        onChange={(event) => updateSql(event.target.value)}
      />
    </TransformEditorShell>
  )
}
