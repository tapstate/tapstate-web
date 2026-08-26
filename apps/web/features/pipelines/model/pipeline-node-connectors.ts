import type { ConnectorSummary, SourceView } from '@/service/source-client'

import type { PipelineNodeConnector } from '../components/canvas/pipeline-canvas-types'

/** Resolves Pipeline Source identities to the connector metadata used by canvas nodes. */
export function pipelineNodeConnectors(
  sources: SourceView[],
  connectors: ConnectorSummary[],
): ReadonlyMap<string, PipelineNodeConnector> {
  const connectorsById = new Map(connectors.map((connector) => [connector.id, connector]))
  const bySourceId = new Map<string, PipelineNodeConnector>()

  for (const source of sources) {
    const connector = connectorsById.get(source.connector)
    if (!connector) continue
    bySourceId.set(source.id, {
      id: connector.id,
      name: connector.name,
      icon: connector.icon,
    })
  }

  return bySourceId
}
