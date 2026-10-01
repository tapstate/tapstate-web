import { Boxes, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { TransformEditorShell } from './transform-editor-shell'
import { TransformSelect } from './transform-select'
import { mergeBody, type TransformEditorProps } from './types'

type EmbedEntry = {
  from: string
  on: string
  as: 'array' | 'object'
  path: string
  arrayKey: string
}

type NestDraft = {
  rootFrom: string
  rootKey: string
  rootMode: string
  embeds: EmbedEntry[]
  primaryKey: string
  order: string
  entriesInMemory: string
  maxElementsPerDocument: string
}

function parseMapping(value: string) {
  return Object.fromEntries(
    value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [child, parent] = part.split('=').map((item) => item.trim())
        return [child ?? '', parent ?? '']
      })
      .filter(([child, parent]) => child && parent),
  )
}

function formatMapping(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ''
  return Object.entries(value)
    .map(([child, parent]) => child + '=' + String(parent))
    .join(', ')
}

function initialEmbeds(value: unknown): EmbedEntry[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => {
    const embed =
      item && typeof item === 'object' && !Array.isArray(item)
        ? (item as Record<string, unknown>)
        : {}
    return {
      from: typeof embed.from === 'string' ? embed.from : '',
      on: formatMapping(embed.on),
      as: embed.as === 'object' ? 'object' : 'array',
      path: typeof embed.path === 'string' ? embed.path : '',
      arrayKey: Array.isArray(embed.arrayKey) ? embed.arrayKey.map(String).join(', ') : '',
    }
  })
}

function initialDraft(body: Record<string, unknown>): NestDraft {
  const root =
    body.root && typeof body.root === 'object' && !Array.isArray(body.root)
      ? (body.root as Record<string, unknown>)
      : {}
  return {
    rootFrom: typeof root.from === 'string' ? root.from : '',
    rootKey: Array.isArray(root.key) ? root.key.map(String).join(', ') : '',
    rootMode: typeof root.mode === 'string' ? root.mode : 'upsert',
    embeds: initialEmbeds(root.embed),
    primaryKey: typeof body.primary_key === 'string' ? body.primary_key : '',
    order: typeof body.order === 'string' ? body.order : 'main_first',
    entriesInMemory:
      typeof body.entries_in_memory === 'number' ? String(body.entries_in_memory) : '',
    maxElementsPerDocument:
      typeof body.max_elements_per_document === 'number'
        ? String(body.max_elements_per_document)
        : '',
  }
}

function embedValue(entry: EmbedEntry) {
  return {
    from: entry.from.trim(),
    on: parseMapping(entry.on),
    as: entry.as,
    path: entry.path.trim(),
    ...(entry.arrayKey.trim()
      ? {
          arrayKey: entry.arrayKey
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
        }
      : {}),
  }
}

function optionalInteger(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return { valid: true, value: undefined as number | undefined }
  if (!/^\d+$/.test(trimmed)) return { valid: false, value: undefined as number | undefined }
  return { valid: true, value: Number(trimmed) }
}

export function NestEditor({ config, onChange }: TransformEditorProps) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(() => initialDraft(config.body))
  const configurationKey = JSON.stringify(config.body)

  useEffect(() => {
    setDraft(initialDraft(config.body))
  }, [configurationKey])

  function update(next: NestDraft) {
    setDraft(next)
    const entriesInMemory = optionalInteger(next.entriesInMemory)
    const maxElementsPerDocument = optionalInteger(next.maxElementsPerDocument)
    if (!entriesInMemory.valid || !maxElementsPerDocument.valid) return

    const existingRoot =
      config.body.root && typeof config.body.root === 'object' && !Array.isArray(config.body.root)
        ? (config.body.root as Record<string, unknown>)
        : {}
    const root = {
      ...existingRoot,
      from: next.rootFrom.trim(),
      key: next.rootKey
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      mode: next.rootMode,
      ...(next.embeds.length > 0 ? { embed: next.embeds.map(embedValue) } : {}),
    }
    onChange?.({
      body: mergeBody(config, {
        root,
        primary_key: next.primaryKey.trim() || undefined,
        order: next.order,
        entries_in_memory: entriesInMemory.value,
        max_elements_per_document: maxElementsPerDocument.value,
      }),
    })
  }

  return (
    <TransformEditorShell
      from={config.from}
      icon={Boxes}
      title={t('pipelines.workspace.transform.nest.title')}
    >
      <div className="pipeline-transform__section-heading">
        {t('pipelines.workspace.transform.root')}
      </div>
      <Input
        aria-label={t('pipelines.workspace.transform.rootStream')}
        value={draft.rootFrom}
        placeholder={t('pipelines.workspace.transform.rootStream')}
        onChange={(event) => update({ ...draft, rootFrom: event.target.value })}
      />
      <Input
        aria-label={t('pipelines.workspace.transform.rootKey')}
        value={draft.rootKey}
        placeholder={t('pipelines.workspace.transform.rootKey')}
        onChange={(event) => update({ ...draft, rootKey: event.target.value })}
      />
      <div className="pipeline-transform__two-column">
        <TransformSelect
          label={t('pipelines.workspace.transform.rootMode')}
          value={draft.rootMode}
          options={[
            { value: 'upsert', label: t('pipelines.workspace.transform.upsert') },
            { value: 'append', label: t('pipelines.workspace.transform.append') },
          ]}
          onChange={(rootMode) => update({ ...draft, rootMode })}
        />
        <TransformSelect
          label={t('pipelines.workspace.transform.order')}
          value={draft.order}
          options={[
            { value: 'main_first', label: t('pipelines.workspace.transform.mainFirst') },
            { value: 'sub_first', label: t('pipelines.workspace.transform.subFirst') },
          ]}
          onChange={(order) => update({ ...draft, order })}
        />
      </div>
      <div className="pipeline-transform__section-heading">
        {t('pipelines.workspace.transform.embeds')}
      </div>
      <div className="pipeline-transform__mapping-list">
        {draft.embeds.map((embed, index) => (
          <div key={index + '-' + embed.from} className="pipeline-transform__nest-embed">
            <Input
              aria-label={t('pipelines.workspace.transform.childStream')}
              value={embed.from}
              placeholder={t('pipelines.workspace.transform.childStream')}
              onChange={(event) =>
                update({
                  ...draft,
                  embeds: draft.embeds.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, from: event.target.value } : item,
                  ),
                })
              }
            />
            <Input
              aria-label={t('pipelines.workspace.transform.keyMapping')}
              value={embed.on}
              placeholder={t('pipelines.workspace.transform.keyMapping')}
              onChange={(event) =>
                update({
                  ...draft,
                  embeds: draft.embeds.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, on: event.target.value } : item,
                  ),
                })
              }
            />
            <div className="pipeline-transform__two-column">
              <TransformSelect
                label={t('pipelines.workspace.transform.embedShape')}
                value={embed.as}
                options={[
                  { value: 'array', label: t('pipelines.workspace.transform.arrayShape') },
                  { value: 'object', label: t('pipelines.workspace.transform.objectShape') },
                ]}
                onChange={(as) =>
                  update({
                    ...draft,
                    embeds: draft.embeds.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, as } : item,
                    ),
                  })
                }
              />
              <Input
                aria-label={t('pipelines.workspace.transform.embedPath')}
                value={embed.path}
                placeholder={t('pipelines.workspace.transform.embedPath')}
                onChange={(event) =>
                  update({
                    ...draft,
                    embeds: draft.embeds.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, path: event.target.value } : item,
                    ),
                  })
                }
              />
            </div>
            <Input
              aria-label={t('pipelines.workspace.transform.arrayKey')}
              value={embed.arrayKey}
              placeholder={t('pipelines.workspace.transform.arrayKey')}
              onChange={(event) =>
                update({
                  ...draft,
                  embeds: draft.embeds.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, arrayKey: event.target.value } : item,
                  ),
                })
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t('pipelines.workspace.transform.removeEmbed')}
              onClick={() =>
                update({
                  ...draft,
                  embeds: draft.embeds.filter((_, itemIndex) => itemIndex !== index),
                })
              }
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
        onClick={() =>
          update({
            ...draft,
            embeds: [...draft.embeds, { from: '', on: '', as: 'array', path: '', arrayKey: '' }],
          })
        }
      >
        <Plus className="size-3.5" />
        {t('pipelines.workspace.transform.addEmbed')}
      </Button>
      <div className="pipeline-transform__section-heading">
        {t('pipelines.workspace.transform.advanced')}
      </div>
      <Input
        aria-label={t('pipelines.workspace.transform.primaryKey')}
        value={draft.primaryKey}
        placeholder={t('pipelines.workspace.transform.primaryKey')}
        onChange={(event) => update({ ...draft, primaryKey: event.target.value })}
      />
      <div className="pipeline-transform__two-column">
        <Input
          aria-label={t('pipelines.workspace.transform.entriesInMemory')}
          value={draft.entriesInMemory}
          placeholder={t('pipelines.workspace.transform.entriesInMemory')}
          inputMode="numeric"
          onChange={(event) => update({ ...draft, entriesInMemory: event.target.value })}
        />
        <Input
          aria-label={t('pipelines.workspace.transform.capacity')}
          value={draft.maxElementsPerDocument}
          placeholder={t('pipelines.workspace.transform.capacity')}
          inputMode="numeric"
          onChange={(event) => update({ ...draft, maxElementsPerDocument: event.target.value })}
        />
      </div>
      {(!optionalInteger(draft.entriesInMemory).valid ||
        !optionalInteger(draft.maxElementsPerDocument).valid) && (
        <p className="pipeline-transform__validation">
          {t('pipelines.workspace.transform.invalidInteger')}
        </p>
      )}
    </TransformEditorShell>
  )
}
