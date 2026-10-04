import type { SourceView } from '@/service/source-client'

type SourceTableScope = { tables?: SourceView['tables'] }

/** Whether a discovered table belongs to the table scope configured on a source. */
export function sourceAllowsTable(source: SourceTableScope | undefined, table: string) {
  if (!source || source.tables == null) return true
  return source.tables.some((configuredTable) => {
    if (configuredTable.name === table) return true
    if (!configuredTable.pattern) return false
    try {
      return new RegExp(configuredTable.pattern).test(table)
    } catch {
      return false
    }
  })
}

/** Returns discovered table names allowed by a source's exact-name and pattern scopes. */
export function sourceScopedTableNames(
  source: SourceTableScope,
  discoveredNames: readonly string[],
) {
  if (source.tables == null)
    return [...new Set(discoveredNames.filter((name) => sourceAllowsTable(source, name)))]

  const configuredNames = source.tables.flatMap((table) => (table.name ? [table.name] : []))
  const patternMatches = discoveredNames.filter(
    (name) => !configuredNames.includes(name) && sourceAllowsTable(source, name),
  )
  return [...new Set([...configuredNames, ...patternMatches])]
}
