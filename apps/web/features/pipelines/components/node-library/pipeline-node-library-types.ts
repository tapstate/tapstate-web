export type PipelineTransformType = 'filter' | 'map' | 'join' | 'union' | 'nest' | 'js'

export type PipelineNodeChoice =
  | {
      kind: 'source'
      sourceId: string
      table: string
      connectorId: string | null
    }
  | {
      kind: 'transform'
      transformType: PipelineTransformType
    }
  | { kind: 'view' }
  | {
      kind: 'target'
      /** When selected from a Source catalog entry, preconfigure the downstream sink. */
      sourceId?: string
      table?: string
      connectorId?: string | null
    }

export interface PipelineNodeInsertionContext {
  position: { x: number; y: number }
  /** Browser coordinates are only used to anchor the selector. They are never persisted. */
  screenPosition?: { x: number; y: number }
  connectFrom: string | null
  /** The node to connect the newly selected node into (input-side insertion). */
  connectTo?: string | null
  /** When present, the selected node replaces this edge with two ordered hops. */
  insertEdge?: { id: string; source: string; target: string }
}
