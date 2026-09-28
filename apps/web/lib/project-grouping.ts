/**
 * Groups list items by the reserved `project` label that the CLI writes into
 * `metadata.labels.project` when it applies a project.
 *
 * Every server has a Default project (id `default`) from its first start. Any
 * item without a project label belongs to it, so unlabeled items are never
 * dropped. Grouping is by the label value only, never by id shape.
 */

export const PROJECT_LABEL = 'project'

/** Id of the project that every server has and that owns unlabeled items. */
export const DEFAULT_PROJECT_ID = 'default'

export interface ProjectGroup<T> {
  /** Project id; `DEFAULT_PROJECT_ID` for the Default project group. */
  project: string
  items: T[]
}

/**
 * Reads `labels.project` from an item's metadata. The metadata shape is loose
 * (older servers may omit it, and source metadata is typed as free-form JSON),
 * so every level is checked at runtime. Blank values count as unlabeled.
 */
export function projectLabel(metadata: unknown): string | null {
  if (!isRecord(metadata)) return null
  const labels = metadata.labels
  if (!isRecord(labels)) return null
  const value = labels[PROJECT_LABEL]
  return typeof value === 'string' && value.trim() !== '' ? value : null
}

/** True when the group is the Default project. */
export function isDefaultProject(group: { project: string }): boolean {
  return group.project === DEFAULT_PROJECT_ID
}

/**
 * Splits items into project groups. The Default project group always comes
 * first and is always present, even when empty; it holds unlabeled items and
 * items labeled with the default id. The other projects follow sorted by id.
 * Item order inside a group follows the input order.
 */
export function groupByProject<T>(
  items: readonly T[],
  projectOf: (item: T) => string | null,
): ProjectGroup<T>[] {
  const defaultItems: T[] = []
  const byProject = new Map<string, T[]>()
  for (const item of items) {
    const project = projectOf(item) ?? DEFAULT_PROJECT_ID
    if (project === DEFAULT_PROJECT_ID) {
      defaultItems.push(item)
      continue
    }
    const group = byProject.get(project)
    if (group) group.push(item)
    else byProject.set(project, [item])
  }
  const others = [...byProject.keys()]
    .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0))
    .map((project) => ({ project, items: byProject.get(project) ?? [] }))
  return [{ project: DEFAULT_PROJECT_ID, items: defaultItems }, ...others]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
