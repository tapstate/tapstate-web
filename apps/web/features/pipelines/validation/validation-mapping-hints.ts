import type { PipelineView } from '@/service/pipelines/pipeline-client'
import type {
  ValidationSelection,
  ValidationSourceHints,
  ValidationTask,
} from '@/service/pipelines/validation-client'

export type MappingHintReason =
  | 'unresolved-output'
  | 'unsupported-path'
  | 'unknown-scope'
  | 'missing-discovery'
  | 'mapping-limit'
  | 'ambiguous-input'
export interface ValidationMappingHint {
  key: string
  outputId: string
  sourceId: string | null
  table: string | null
  targetSourceId: string | null
  choice: ValidationSelection['mappings'][number] | null
  reason: MappingHintReason | null
  retainedDiscoveryAt: number | null
}

type HintsReader = (source: string) => Promise<ValidationSourceHints | null>
const MAX_MAPPINGS = 1024
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const names = (value: unknown): string[] | null => {
  if (typeof value === 'string') return [value]
  const values = Array.isArray(value) ? value : object(value) ? Object.values(value) : null
  return values?.every((item): item is string => typeof item === 'string') ? values : null
}

/** Saved graph coordinates and retained schema names are hints; only server evaluation can admit a selection. */
export async function validationMappingHints(
  pipeline: PipelineView,
  readHints: HintsReader,
  saved: ValidationTask | null,
  newId: () => string = () => crypto.randomUUID(),
): Promise<readonly ValidationMappingHint[]> {
  const unavailable = (outputId: string, reason: MappingHintReason): ValidationMappingHint => ({
    key: JSON.stringify([outputId, reason]),
    outputId,
    sourceId: null,
    table: null,
    targetSourceId: null,
    choice: null,
    reason,
    retainedDiscoveryAt: null,
  })
  if (pipeline.serve?.use || !pipeline.serve?.sync?.length)
    return [unavailable('', 'unresolved-output')]
  const nodes = new Map(pipeline.dag.nodes.map((node) => [node.id, node]))
  const knownSources = new Map((pipeline.sources ?? []).map((source) => [source.id, source]))
  const references = names(pipeline.serve.from)
  const collision = new Set((pipeline.transforms ?? []).map((step) => step.id))
  if (pipeline.view?.id) collision.add(pipeline.view.id)
  const discovery = new Map<string, Promise<ValidationSourceHints | null>>()
  const result: ValidationMappingHint[] = []
  const outputs = new Set<string>()
  for (const sync of pipeline.serve.sync) {
    if (typeof sync.id !== 'string' || !sync.id || outputs.has(sync.id))
      return [unavailable('', 'unresolved-output')]
    outputs.add(sync.id)
    const edges = pipeline.dag.edges.filter(
      (edge) => edge.label === sync.id && nodes.get(edge.target)?.type === 'target',
    )
    if (!edges.length) {
      result.push(unavailable(sync.id, 'unresolved-output'))
      continue
    }
    let failure: MappingHintReason | null = null
    const candidates: ValidationMappingHint[] = []
    const physical = new Set<string>()
    for (const edge of edges) {
      const node = nodes.get(edge.source)
      if (!node || node.type !== 'source') {
        failure = 'unsupported-path'
        break
      }
      // A bare Source id can have no graph detail when more than one Source is declared.
      const qualifiedLiteral = node.detail && references?.includes(`${node.detail}.${node.label}`)
      const whole =
        !qualifiedLiteral &&
        references?.includes(node.label) &&
        knownSources.has(node.label) &&
        !collision.has(node.label)
      const sourceId = whole ? node.label : node.detail
      if (
        !sourceId ||
        !knownSources.has(sourceId) ||
        knownSources.get(sourceId)?.resolved === false
      ) {
        failure = 'unknown-scope'
        break
      }
      let tables: readonly { name: string }[]
      let retainedDiscoveryAt: number | null = null
      if (whole) {
        let pending = discovery.get(sourceId)
        if (!pending) {
          pending = readHints(sourceId)
          discovery.set(sourceId, pending)
        }
        const hints = await pending
        if (!hints || hints.connectionId !== sourceId || !hints.tables.length) {
          failure = 'missing-discovery'
          break
        }
        tables = hints.tables
        retainedDiscoveryAt = hints.discoveredAt
      } else {
        // Regex resolution belongs to the server. The projected label is a physical name only for literals.
        if (
          !references ||
          node.label.startsWith('/') ||
          !references.some(
            (ref) =>
              ref === `${sourceId}.${node.label}` ||
              (ref === node.label &&
                knownSources.size === 1 &&
                !knownSources.has(ref) &&
                !collision.has(ref)),
          )
        ) {
          failure = 'unknown-scope'
          break
        }
        tables = [{ name: node.label }]
      }
      for (const table of tables) {
        const key = JSON.stringify([sync.id, sourceId, table.name])
        if (physical.has(key)) {
          failure = 'ambiguous-input'
          break
        }
        physical.add(key)
        const original = saved?.mappings.find(
          (mapping) =>
            mapping.outputId === sync.id &&
            mapping.sourceId === sourceId &&
            mapping.sourceTable === table.name,
        )
        candidates.push({
          key,
          outputId: sync.id,
          sourceId,
          table: table.name,
          targetSourceId: typeof sync.source === 'string' ? sync.source : null,
          choice: {
            mappingId: original?.mappingId ?? newId(),
            outputId: sync.id,
            sourceId,
            table: table.name,
          },
          reason: null,
          retainedDiscoveryAt,
        })
        if (result.length + candidates.length > MAX_MAPPINGS)
          return [unavailable('', 'mapping-limit')]
      }
      if (failure) break
    }
    if (failure) result.push(unavailable(sync.id, failure))
    else result.push(...candidates)
    if (result.length > MAX_MAPPINGS) return [unavailable('', 'mapping-limit')]
  }
  return result.length ? result : [unavailable('', 'unresolved-output')]
}
