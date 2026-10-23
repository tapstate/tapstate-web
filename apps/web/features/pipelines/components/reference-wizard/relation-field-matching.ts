export interface RelationFieldTable {
  name: string
  columns: readonly string[]
  primaryKey?: string
  keys?: readonly string[]
  defaultKey?: string
  defaultParentKey?: string
}

export interface RelationFieldMatch {
  childField: string
  parentField: string
}

export function matchRelationFields(
  child: RelationFieldTable,
  parent: RelationFieldTable,
): RelationFieldMatch | null {
  const childColumns = byNormalizedName(child.columns)
  const parentColumns = byNormalizedName(parent.columns)
  const childKeyCandidates = [child.defaultKey, ...(child.keys ?? []), child.primaryKey]
  const childKey = firstExisting(childColumns, childKeyCandidates)
  const explicitParentKey = parentColumns.get(normalize(child.defaultParentKey))

  if (childKey && explicitParentKey) {
    return { childField: childKey, parentField: explicitParentKey }
  }

  const childKeys = uniqueFields(childKeyCandidates).filter((field) =>
    childColumns.has(normalize(field)),
  )
  const parentKeys = uniqueFields([
    parent.defaultKey,
    ...(parent.keys ?? []),
    parent.primaryKey,
  ]).filter((field) => parentColumns.has(normalize(field)))
  const tableStems = relatedTableStems(parent.name)
  const inferred = parentKeys.flatMap((parentKey) => {
    const keySuffix = normalize(parentKey).split(/[_-]/).at(-1) || normalize(parentKey)
    const candidates = new Set(
      tableStems.flatMap((stem) => [`${stem}_${keySuffix}`, `${stem}${keySuffix}`]),
    )
    const matchingChildFields = [...candidates]
      .map((candidate) => childColumns.get(candidate))
      .filter((field): field is string => Boolean(field))

    return matchingChildFields.length === 1
      ? [
          {
            childField: matchingChildFields[0],
            parentField: parentColumns.get(normalize(parentKey))!,
          },
        ]
      : []
  })

  if (inferred.length === 1) return inferred[0]
  if (inferred.length > 1) return null

  const sharedFields = child.columns.filter((field) => {
    const normalized = normalize(field)
    const isKnownKey =
      childKeys.some((key) => normalize(key) === normalized) ||
      parentKeys.some((key) => normalize(key) === normalized)
    return (
      isKnownKey && parentColumns.has(normalized) && normalized !== 'id' && normalized !== 'uuid'
    )
  })

  if (sharedFields.length === 1) {
    return {
      childField: sharedFields[0],
      parentField: parentColumns.get(normalize(sharedFields[0]))!,
    }
  }

  return null
}

function byNormalizedName(fields: readonly string[]) {
  return new Map(fields.map((field) => [normalize(field), field]))
}

function firstExisting(
  fields: ReadonlyMap<string, string>,
  candidates: readonly (string | undefined)[],
) {
  return candidates.map((candidate) => fields.get(normalize(candidate))).find(Boolean)
}

function uniqueFields(fields: readonly (string | undefined)[]) {
  return [...new Set(fields.filter((field): field is string => Boolean(field)))]
}

function relatedTableStems(tableName: string) {
  const name = tableName.split(/[./]/).at(-1) ?? tableName
  const segments = name.split(/[_-]/).filter(Boolean)
  const suffixes = segments.map((_, index) => segments.slice(index).join('_'))
  const stems = uniqueFields([name, ...suffixes]).flatMap((stem) => {
    const singular = stem.replace(/s$/i, '')
    return singular === stem ? [stem] : [stem, singular]
  })
  return [...new Set(stems.map(normalize))]
}

function normalize(value?: string) {
  return value?.trim().toLocaleLowerCase() ?? ''
}
