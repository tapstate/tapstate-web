import type {
  PipelineJsonObject,
  PipelineSourceSummary,
  PipelineTransformStep,
  PipelineView,
} from '@/service/pipelines/pipeline-client'

import type { PipelineSourceTableKind } from '../components/node-library/pipeline-node-library-types'

export interface PipelineSourceNodeConfiguration {
  kind: 'source'
  nodeId: string
  sourceId: string
  /** The tables selected by this one Source node. `table` remains the legacy primary value. */
  tables?: PipelineSourceTableSelection[]
  table: string
  tableKind?: PipelineSourceTableKind
  connectorId: string | null
}

export interface PipelineSourceTableSelection {
  table: string
  tableKind?: PipelineSourceTableKind
}

export interface PipelineTargetTableMapping {
  sourceTable: string
  targetTable: string
}

export interface PipelineTargetNodeConfiguration {
  kind: 'target'
  nodeId: string
  sourceId: string
  table: string
  /** Present when one target node receives more than one upstream table. */
  tableMappings?: PipelineTargetTableMapping[]
  connectorId: string | null
  writeMode: string
  /**
   * What a new full load does to rows already in the target. Absent when the Pipeline does not
   * say, so a node that never mentioned it publishes exactly what it did before.
   */
  onFullLoad?: string
}

/** The full-load policies a draft spells in lowercase; the detail endpoint reports enum names. */
export const PIPELINE_ON_FULL_LOAD_POLICIES = ['append', 'clear', 'fail'] as const

export type PipelineOnFullLoad = (typeof PIPELINE_ON_FULL_LOAD_POLICIES)[number]

const PIPELINE_WRITE_MODES = ['upsert', 'append'] as const

/**
 * Normalizes a write setting to the spelling a draft carries. Known values are lowercased because
 * the detail endpoint reports them as enum names; a value this client does not know is kept as
 * written, so a round trip never drops or rewrites it.
 */
function writeSettingValue(value: unknown, known: readonly string[]): string | undefined {
  if (typeof value !== 'string' || value.trim().length === 0) return undefined
  const lowercase = value.toLowerCase()
  return known.includes(lowercase) ? lowercase : value
}

export function writeModeValue(value: unknown): string | undefined {
  return writeSettingValue(value, PIPELINE_WRITE_MODES)
}

export function onFullLoadValue(value: unknown): string | undefined {
  return writeSettingValue(value, PIPELINE_ON_FULL_LOAD_POLICIES)
}

export function isPipelineOnFullLoad(value: unknown): value is PipelineOnFullLoad {
  return (PIPELINE_ON_FULL_LOAD_POLICIES as readonly unknown[]).includes(value)
}

export function sourceTableSelections(
  configuration: PipelineSourceNodeConfiguration,
): PipelineSourceTableSelection[] {
  if (configuration.tables && configuration.tables.length > 0) {
    return configuration.tables.map((selection) => ({ ...selection }))
  }
  return configuration.table
    ? [
        {
          table: configuration.table,
          ...(configuration.tableKind ? { tableKind: configuration.tableKind } : {}),
        },
      ]
    : []
}

export interface PipelineTransformNodeConfiguration {
  kind: 'transform'
  nodeId: string
  stepId: string
  transformType: string
  from: unknown
  options: PipelineJsonObject | null
  body: PipelineJsonObject
}

export interface PipelineViewNodeConfiguration {
  kind: 'view'
  nodeId: string
  viewId: string
  from: unknown
  body: PipelineJsonObject
  /** How rows are written to the view; absent when the Pipeline does not say. */
  writeMode?: string
  /** What a new full load does to rows already in the view; absent when the Pipeline does not say. */
  onFullLoad?: string
}

const VIEW_WRITE_SETTING_KEYS = new Set(['writeMode', 'write_mode', 'onFullLoad', 'on_full_load'])

/**
 * Splits a view's write settings out of its block, in the spelling a draft carries. The block itself
 * stays as it was otherwise, so every key this client does not model round-trips untouched.
 */
export function viewWriteSettings(block: PipelineJsonObject): {
  body: PipelineJsonObject
  writeMode?: string
  onFullLoad?: string
} {
  const writeMode = writeModeValue(block.writeMode ?? block.write_mode)
  const onFullLoad = onFullLoadValue(block.onFullLoad ?? block.on_full_load)
  return {
    body: Object.fromEntries(
      Object.entries(block).filter(([key]) => !VIEW_WRITE_SETTING_KEYS.has(key)),
    ),
    ...(writeMode ? { writeMode } : {}),
    ...(onFullLoad ? { onFullLoad } : {}),
  }
}

export type PipelineNodeConfiguration =
  | PipelineSourceNodeConfiguration
  | PipelineTargetNodeConfiguration
  | PipelineTransformNodeConfiguration
  | PipelineViewNodeConfiguration

export interface PipelineNodeConfigurationChange {
  nodeId: string
  kind: PipelineNodeConfiguration['kind']
  values: PipelineJsonObject
}

function nodeParts(nodeId: string) {
  const [kind, ...parts] = nodeId.split(':')
  return { kind, sourceId: parts[0] ?? '', table: parts.slice(1).join(':') }
}

function sourceById(sources: readonly PipelineSourceSummary[] | undefined, id: string) {
  return sources?.find((source) => source.id === id)
}

function stepBody(step: PipelineTransformStep): PipelineJsonObject {
  if (isRecord(step.body)) return step.body

  // PipelineView keeps transform-specific keys beside the step metadata.
  // Preserve every unknown key so a custom editor can render the complete
  // projection instead of silently dropping join/map/nest options.
  const metadata = new Set(['id', 'from', 'type', 'use', 'options', 'experimental'])
  return Object.fromEntries(
    Object.entries(step).filter(([key, value]) => !metadata.has(key) && value !== undefined),
  )
}

function transformType(step: PipelineTransformStep) {
  if (typeof step.type === 'string') return step.type
  if (typeof step.use === 'string') return 'use'
  return 'transform'
}

function targetSyncItem(view: PipelineView, nodeId: string) {
  const { sourceId } = nodeParts(nodeId)
  const syncItems = view.serve?.sync ?? []
  return syncItems.find((item) => {
    if (!isRecord(item)) return false
    // The target DAG node is keyed by the destination source id. The sync
    // entry id often names the mapping rather than the destination source.
    return (
      item.source === sourceId ||
      item.target === sourceId ||
      item.destination === sourceId ||
      item.id === sourceId
    )
  })
}

/** The write settings of the sync element a target node publishes, in the draft's spelling. */
function targetWriteSettings(view: PipelineView, nodeId: string) {
  const target = targetSyncItem(view, nodeId)
  const onFullLoad = onFullLoadValue(target?.onFullLoad ?? target?.on_full_load)
  return {
    writeMode: writeModeValue(target?.writeMode ?? target?.write_mode) ?? 'upsert',
    ...(onFullLoad ? { onFullLoad } : {}),
  }
}

/** Maps the structured PipelineView to node-level editor models without parsing YAML in the browser. */
export function pipelineNodeConfigurations(view: PipelineView) {
  const configurations = new Map<string, PipelineNodeConfiguration>()
  for (const node of view.dag.nodes) {
    const parts = nodeParts(node.id)
    if (parts.kind === 'source') {
      configurations.set(node.id, {
        kind: 'source',
        nodeId: node.id,
        sourceId: parts.sourceId || node.detail || '',
        table: parts.table || node.label,
        ...(isRegexReference(parts.table) ? { tableKind: 'regex' } : {}),
        connectorId:
          sourceById(view.sources, parts.sourceId || node.detail || '')?.connector ?? null,
      })
      continue
    }
    if (parts.kind === 'target') {
      configurations.set(node.id, {
        kind: 'target',
        nodeId: node.id,
        sourceId: parts.sourceId || node.detail || '',
        table: parts.table || node.label,
        connectorId:
          sourceById(view.sources, parts.sourceId || node.detail || '')?.connector ?? null,
        ...targetWriteSettings(view, node.id),
      })
      continue
    }
    if (parts.kind === 'transform') {
      const stepId = parts.sourceId || node.label
      const step = view.transforms?.find((candidate) => candidate.id === stepId)
      if (!step) continue
      configurations.set(node.id, {
        kind: 'transform',
        nodeId: node.id,
        stepId,
        transformType: transformType(step),
        from: step.from,
        options: isRecord(step.options) ? step.options : null,
        body: {
          ...stepBody(step),
          ...(isRecord(step.experimental) ? { experimental: step.experimental } : {}),
        },
      })
      continue
    }
    if (parts.kind === 'view' && view.view) {
      configurations.set(node.id, {
        kind: 'view',
        nodeId: node.id,
        viewId: parts.sourceId || node.label,
        from: view.view.from,
        ...viewWriteSettings(view.view),
      })
    }
  }
  for (const node of view.dag.nodes) {
    const configuration = configurations.get(node.id)
    if (configuration?.kind !== 'target') continue
    const sourceTables = sourceTablesUpstream(node.id, view.dag.edges, configurations)
    if (sourceTables.length < 2) continue
    const targetTables = Array.isArray(node.tableRefs) ? node.tableRefs : []
    configurations.set(node.id, {
      ...configuration,
      tableMappings: sourceTables.map((sourceTable, index) => ({
        sourceTable: displaySourceTable(sourceTable),
        targetTable: targetTables[index] ?? sourceTable.table,
      })),
    })
  }
  return configurations
}

/** Walks a persisted DAG back to the Source tables feeding one target node. */
function sourceTablesUpstream(
  targetNodeId: string,
  edges: readonly { source: string; target: string }[],
  configurations: ReadonlyMap<string, PipelineNodeConfiguration>,
) {
  const visited = new Set<string>()
  const walk = (nodeId: string): PipelineSourceTableSelection[] => {
    if (visited.has(nodeId)) return []
    visited.add(nodeId)
    const configuration = configurations.get(nodeId)
    if (configuration?.kind === 'source') return sourceTableSelections(configuration)
    if (configuration?.kind === 'transform') return [{ table: configuration.stepId }]
    if (configuration?.kind === 'view') return [{ table: configuration.viewId }]
    return edges.filter((edge) => edge.target === nodeId).flatMap((edge) => walk(edge.source))
  }
  return walk(targetNodeId)
}

function displaySourceTable(selection: PipelineSourceTableSelection) {
  return selection.tableKind === 'regex' && !isRegexReference(selection.table)
    ? `/${selection.table}/`
    : selection.table
}

function isRegexReference(value: string) {
  return value.length > 1 && value.startsWith('/') && value.endsWith('/')
}

function isRecord(value: unknown): value is PipelineJsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
