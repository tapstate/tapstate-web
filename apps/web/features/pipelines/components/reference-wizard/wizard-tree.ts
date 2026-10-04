import type { RelationNode } from './ReferenceWizardBuilder'

export const flattenRelations = (nodes: RelationNode[]): RelationNode[] =>
  nodes.flatMap((node) => [node, ...flattenRelations(node.children || [])])

export const relationToken = (node: RelationNode) => `${node.table} · ${node.id}`

export function reparentRelation(
  nodes: RelationNode[],
  id: string,
  parentToken: string,
  rootTable: string,
  update: (node: RelationNode) => RelationNode,
): RelationNode[] {
  const flat = flattenRelations(nodes)
  const node = flat.find((n) => n.id === id)
  const parent = flat.find((n) => relationToken(n) === parentToken)
  if (!node || (parentToken !== rootTable && !parent)) return nodes
  if (parent && flattenRelations([node]).some((n) => n.id === parent.id)) return nodes
  const remove = (items: RelationNode[]): RelationNode[] =>
    items.filter((n) => n.id !== id).map((n) => ({ ...n, children: remove(n.children || []) }))
  const remaining = remove(nodes)
  const next = update(node)
  if (!parent) return [...remaining, next]
  const insert = (items: RelationNode[]): RelationNode[] =>
    items.map((n) =>
      n.id === parent.id
        ? { ...n, children: [...(n.children || []), next] }
        : { ...n, children: insert(n.children || []) },
    )
  return insert(remaining)
}
