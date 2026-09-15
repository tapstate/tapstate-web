import type { SourceView } from '@/service/source-client'

/**
 * The connectors a Pipeline target may write through.
 *
 * A target node names a Source the same way a source node does, so nothing in the graph model
 * distinguishes what a Source is allowed to be read from and what it is allowed to be written to.
 * That boundary lives here, and both surfaces that can put a Source under a target consult it: the
 * picker that offers the Sources, and the validation that runs before a save.
 *
 * The whole MongoDB family rather than the bare id. Support is certified per database kind, and the
 * managed variants are the same database underneath — a deployment running one registers that
 * variant's id and no other, so admitting only `mongodb` would leave it unable to build any Pipeline
 * at all. The server draws the boundary the same way and refuses what falls outside it, which is
 * what makes this list a convenience rather than the rule itself.
 *
 * `mongodb3` is deliberately absent: it is not in the release's supported set, so a server that
 * accepts it at all is one an operator explicitly widened, and the workbench does not offer what
 * this release does not certify.
 */
export const TARGET_CONNECTOR_IDS = [
  'mongodb',
  'mongodb-atlas',
  'aliyun-db-mongodb',
  'tencent-db-mongodb',
] as const

/** What deciding a Source's eligibility needs — its id and the connector it goes through. */
export type SourceIdentity = Pick<SourceView, 'id' | 'connector'>

/** Whether a Source on this connector may back a target node. */
export function isTargetConnector(connector: string | null | undefined) {
  return TARGET_CONNECTOR_IDS.some((id) => id === connector)
}

/** The Sources a target node may be pointed at, in the order they were given. */
export function targetSources<T extends SourceIdentity>(sources: readonly T[]) {
  return sources.filter((source) => isTargetConnector(source.connector))
}
