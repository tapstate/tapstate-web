import type { SourceView } from '@/service/source-client'

/**
 * The only connector a Pipeline target may write through.
 *
 * A target node names a Source the same way a source node does, so nothing in the graph model
 * distinguishes what a Source is allowed to be read from and what it is allowed to be written to.
 * That boundary lives here, and both surfaces that can put a Source under a target consult it: the
 * picker that offers the Sources, and the validation that runs before a save.
 *
 * One id rather than the MongoDB family: `mongodb-atlas`, `aliyun-db-mongodb`,
 * `tencent-db-mongodb` and `mongodb3` are separate connectors in the catalog, and admitting one of
 * them is a support decision of its own rather than another spelling of this one.
 */
export const TARGET_CONNECTOR_ID = 'mongodb'

/** What deciding a Source's eligibility needs — its id and the connector it goes through. */
export type SourceIdentity = Pick<SourceView, 'id' | 'connector'>

/** Whether a Source on this connector may back a target node. */
export function isTargetConnector(connector: string | null | undefined) {
  return connector === TARGET_CONNECTOR_ID
}

/** The Sources a target node may be pointed at, in the order they were given. */
export function targetSources<T extends SourceIdentity>(sources: readonly T[]) {
  return sources.filter((source) => isTargetConnector(source.connector))
}
