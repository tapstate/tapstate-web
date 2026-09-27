/**
 * Groups list items by the reserved `project` label that the CLI writes into
 * `metadata.labels.project` when it applies a project.
 *
 * Grouping is by the label value only, never by id shape. Items without a
 * label are never dropped: they form one trailing group whose `project` is
 * `null`, so callers can title it ("No project", "Shared by all projects").
 */

export const PROJECT_LABEL = 'project'

export interface ProjectGroup<T> {
  /** Project id from the label, or `null` for the trailing unlabeled group. */
  project: string | null
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

/**
 * Splits items into project groups sorted by project id, followed by the
 * unlabeled group when it is non-empty. Item order inside a group follows the
 * input order.
 */
export function groupByProject<T>(
  items: readonly T[],
  projectOf: (item: T) => string | null,
): ProjectGroup<T>[] {
  const byProject = new Map<string, T[]>()
  const unlabeled: T[] = []
  for (const item of items) {
    const project = projectOf(item)
    if (project === null) {
      unlabeled.push(item)
      continue
    }
    const group = byProject.get(project)
    if (group) group.push(item)
    else byProject.set(project, [item])
  }
  const groups: ProjectGroup<T>[] = [...byProject.keys()]
    .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0))
    .map((project) => ({ project, items: byProject.get(project) ?? [] }))
  if (unlabeled.length > 0) groups.push({ project: null, items: unlabeled })
  return groups
}

/**
 * True when at least one group carries a project label. Pages render the flat,
 * header-less list otherwise, so servers that predate project labels look
 * unchanged.
 */
export function hasProjectGroups<T>(groups: readonly ProjectGroup<T>[]): boolean {
  return groups.some((group) => group.project !== null)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
