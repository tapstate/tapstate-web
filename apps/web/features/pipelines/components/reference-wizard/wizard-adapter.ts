import type { PipelineJsonObject } from '@/service/pipelines/pipeline-client'

import type { DeploymentProfile } from '../../model/deployment-profile'
import type { DataSourceMeta, RelationNode, WizardViewState } from './ReferenceWizardBuilder'
import type { TransformStep } from './TableTransformsManager'

const object = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
const text = (v: unknown): string => (typeof v === 'string' ? v : '')
const array = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const strings = (v: unknown): string[] => array(v).filter((x): x is string => typeof x === 'string')

export function summarizeWizard(value: PipelineJsonObject | null) {
  const wizard = object(value)
  const related = array(wizard.related).map(object)
  const transforms = [
    ...array(object(wizard.root).preTransforms),
    ...related.flatMap((relation) => array(relation.preTransforms)),
    ...array(wizard.transforms),
  ]

  return {
    rootTable: text(object(wizard.root).table),
    relatedCount: related.length,
    transformCount: transforms.length,
  }
}

export function readTransforms(value: unknown): TransformStep[] {
  return array(value).flatMap((raw) => {
    const t = object(raw),
      fields = object(t.fields)
    const type = text(t.type)
    if (!['filter', 'map', 'unwind', 'js', 'union'].includes(type)) return []
    return [
      {
        id: text(t.id),
        name: text(t.name) || type,
        type: type as TransformStep['type'],
        enabled: t.enabled !== false,
        isExpanded: false,
        config:
          type === 'filter'
            ? { filter: { expr: text(fields.expr), isRawCel: true } }
            : type === 'map'
              ? {
                  map: {
                    passthroughUnlisted: true,
                    fields: Object.entries(fields).map(([key, v], i) => ({
                      id: `${text(t.id)}-${i}`,
                      outputField: key,
                      ruleType:
                        v === false
                          ? 'delete'
                          : typeof v === 'string' && v.startsWith('$')
                            ? 'rename'
                            : typeof v === 'string' && v.startsWith('=')
                              ? 'compute'
                              : 'literal',
                      value:
                        typeof v === 'string' && (v.startsWith('$') || v.startsWith('='))
                          ? v
                          : JSON.stringify(v),
                    })),
                  },
                }
              : type === 'js'
                ? { js: { script: text(fields.script) } }
                : type === 'union'
                  ? { union: { from: strings(fields.from) } }
                  : {
                      unwind: {
                        path: text(fields.path),
                        element_key: text(fields.element_key),
                        include_array_index: text(fields.include_array_index),
                        preserve_null_and_empty_arrays:
                          fields.preserve_null_and_empty_arrays === true,
                      },
                    },
      },
    ]
  })
}

export function writeTransforms(steps: TransformStep[] = []): PipelineJsonObject[] {
  return steps.map((t) => ({
    id: t.id,
    type: t.type,
    fields:
      t.type === 'filter'
        ? { expr: t.config.filter?.expr || '' }
        : t.type === 'map'
          ? Object.fromEntries(
              (t.config.map?.fields || []).map((f) => [
                f.outputField,
                f.ruleType === 'delete'
                  ? false
                  : f.ruleType === 'literal'
                    ? literalValue(f.value)
                    : f.ruleType === 'rename' && f.value && !f.value.startsWith('$')
                      ? '$' + f.value
                      : f.ruleType === 'compute' && f.value && !f.value.startsWith('=')
                        ? '=' + f.value
                        : f.value,
              ]),
            )
          : t.type === 'js'
            ? { script: t.config.js?.script || '' }
            : t.type === 'union'
              ? { from: t.config.union?.from || [] }
              : { ...t.config.unwind },
  }))
}

function literalValue(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

/** Guard current server compiler gaps rather than publishing incorrect literal values. */
export function wizardPublicationIssue(value: PipelineJsonObject | null): string | null {
  const wizard = object(value)
  const root = object(wizard.root)
  const output = object(object(wizard.output).config)
  if (!text(root.sourceId) || !text(root.table))
    return 'Select and confirm a root table before publishing.'
  if (!text(output.sourceId) || !text(output.table))
    return 'Choose a writable destination source and target table before publishing.'
  const transforms = [
    ...array(root.preTransforms),
    ...array(wizard.related).flatMap((r) => array(object(r).preTransforms)),
    ...array(wizard.transforms),
  ].map(object)
  for (const t of transforms) {
    if (t.type !== 'filter' && t.type !== 'map')
      return `The current server cannot publish Wizard ${text(t.type)} transforms yet. Your configuration is saved as a draft.`
    if (
      t.type === 'map' &&
      Object.values(object(t.fields)).some((v) => typeof v === 'string' && v.startsWith('='))
    )
      return 'The current server cannot compile computed field expressions yet. Your configuration is saved as a draft; publishing is blocked to avoid writing expression strings as data.'
    if (t.type === 'filter' && !text(object(t.fields).expr).trim())
      return 'Complete the filter expression before publishing.'
  }
  return null
}

/** The server cannot upsert rows from a discovered input table without a primary key. */
export function wizardUpsertKeylessInput(
  value: PipelineJsonObject | null,
  catalog: DataSourceMeta[],
) {
  const wizard = object(value)
  const output = object(object(wizard.output).config)
  if ((text(output.writeMode) || 'upsert') !== 'upsert') return null
  const inputs = [object(wizard.root), ...array(wizard.related).map(object)]
  for (const input of inputs) {
    const sourceId = text(input.sourceId)
    const table = text(input.table)
    const metadata = catalog
      .find((source) => source.id === sourceId)
      ?.tables.find((candidate) => candidate.name === table)
    if (metadata?.discovered && (metadata.keys ? metadata.keys.length === 0 : !metadata.primaryKey))
      return { sourceId, table }
  }
  return null
}

export function readWizard(
  value: PipelineJsonObject | null,
  catalog: DataSourceMeta[],
  fallbackDestinationId = '',
  fallbackWriteMode = 'upsert',
): WizardViewState {
  const wizard = object(value),
    root = object(wizard.root),
    output = object(object(wizard.output).config)
  const sourceId = text(root.sourceId),
    table = text(root.table)
  const meta = catalog.find((s) => s.id === sourceId)?.tables.find((t) => t.name === table)
  const rows = array(wizard.related).map(object)
  const token = (id: string) =>
    id === 'root' ? table : `${text(rows.find((r) => r.id === id)?.table)} · ${id}`
  const nodes = new Map<string, RelationNode>()
  for (const r of rows) {
    const relation = object(r.relation),
      on = array(relation.on).map(object)
    const parentTable = token(text(r.parentId) || 'root')
    nodes.set(text(r.id), {
      id: text(r.id),
      source: text(r.sourceId),
      table: text(r.table),
      primaryKey: strings(relation.key),
      type:
        relation.shape === 'flat'
          ? 'flatten'
          : relation.shape === 'array'
            ? 'sub_array'
            : 'sub_doc',
      targetField: text(relation.path),
      key: text(on[0]?.childField),
      parentTable,
      parentKey: text(on[0]?.parentField),
      conditions: on.map((c) => ({
        childKey: text(c.childField),
        parentKey: text(c.parentField),
        parentTable,
        operator: '=',
      })),
      preProcessing: [],
      transforms: readTransforms(r.preTransforms),
      children: [],
    })
  }
  const relations: RelationNode[] = []
  for (const r of rows) {
    const node = nodes.get(text(r.id))!
    const parent = nodes.get(text(r.parentId))
    if (parent && parent !== node) parent.children!.push(node)
    else relations.push(node)
  }
  return {
    root:
      sourceId && table
        ? {
            source: sourceId,
            table,
            primaryKey: strings(root.key).join(', '),
            keys: strings(root.key),
            rowCount: '—',
            columns: meta?.columns || [],
            transforms: readTransforms(root.preTransforms),
          }
        : null,
    relations,
    transforms: readTransforms(wizard.transforms),
    destinationTable: text(output.table),
    destinationSourceId: text(output.sourceId) || fallbackDestinationId,
    destinationWriteMode: text(output.writeMode) || fallbackWriteMode,
  }
}

export function writeWizard(
  state: WizardViewState,
  original: PipelineJsonObject | null,
  destinationId: string,
  deploymentProfile: DeploymentProfile = 'on-prem',
): PipelineJsonObject {
  const previous = object(original),
    originalRows = array(previous.related).map(object)
  const related: PipelineJsonObject[] = []
  const walk = (nodes: RelationNode[], parentId: string) => {
    for (const r of nodes) {
      const old = originalRows.find((x) => x.id === r.id)
      related.push({
        ...old,
        id: r.id,
        parentId,
        sourceId: r.source,
        table: r.table,
        relation: {
          ...object(old?.relation),
          shape: r.type === 'flatten' ? 'flat' : r.type === 'sub_array' ? 'array' : 'object',
          path: r.type === 'flatten' ? null : r.targetField,
          key: r.primaryKey || [],
          arrayKey: r.type === 'sub_array' ? r.primaryKey || [] : [],
          on: (r.conditions || [{ childKey: r.key, parentKey: r.parentKey }]).map((c) => ({
            childField: c.childKey,
            parentField: c.parentKey,
          })),
        },
        preTransforms: writeTransforms(r.transforms),
      })
      walk(r.children || [], r.id)
    }
  }
  walk(state.relations, 'root')
  const transforms = writeTransforms(state.transforms)
  return {
    ...previous,
    root: {
      ...object(previous.root),
      id: 'root',
      sourceId: state.root?.source || '',
      table: state.root?.table || '',
      key: state.root?.keys || [],
      preTransforms: writeTransforms(state.root?.transforms),
    },
    related,
    transforms,
    output: {
      ...object(previous.output),
      kind: deploymentProfile === 'cloud' ? 'atlas' : 'source',
      config: {
        ...object(object(previous.output).config),
        sourceId: state.destinationSourceId || destinationId,
        table: state.destinationTable,
        inputTable: state.root?.table || '',
        writeMode: state.destinationWriteMode || 'upsert',
      },
    },
  }
}
