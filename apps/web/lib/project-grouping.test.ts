import { describe, expect, it } from 'vitest'

import { DEFAULT_PROJECT_ID, groupByProject, projectLabel } from './project-grouping'

interface Item {
  id: string
  metadata?: unknown
}

const byLabel = (item: Item) => projectLabel(item.metadata)

describe('groupByProject', () => {
  it('puts the Default project first with unlabeled items, then projects sorted by id', () => {
    // Ids deliberately disagree with their labels, so prefix-based grouping fails.
    const items: Item[] = [
      { id: 'zeta_first', metadata: { labels: { project: 'bank_c360' } } },
      { id: 'bank_orders', metadata: { labels: { project: 'retail' } } },
      { id: 'legacy', metadata: null },
      { id: 'alpha_second', metadata: { labels: { project: 'bank_c360' } } },
      { id: 'no_labels', metadata: { description: 'x' } },
      { id: 'retail_explicit', metadata: { labels: { project: DEFAULT_PROJECT_ID } } },
    ]

    const groups = groupByProject(items, byLabel)

    expect(groups.map((group) => group.project)).toEqual([
      DEFAULT_PROJECT_ID,
      'bank_c360',
      'retail',
    ])
    expect(groups.map((group) => group.items.map((item) => item.id))).toEqual([
      ['legacy', 'no_labels', 'retail_explicit'],
      ['zeta_first', 'alpha_second'],
      ['bank_orders'],
    ])
  })

  it('puts every item in the Default project when nothing is labeled', () => {
    const items: Item[] = [{ id: 'b' }, { id: 'a', metadata: { labels: {} } }]

    expect(groupByProject(items, byLabel)).toEqual([{ project: DEFAULT_PROJECT_ID, items }])
  })

  it('always returns the Default project group, even when it is empty', () => {
    const items: Item[] = [{ id: 'orders', metadata: { labels: { project: 'retail' } } }]

    expect(groupByProject(items, byLabel)).toEqual([
      { project: DEFAULT_PROJECT_ID, items: [] },
      { project: 'retail', items },
    ])
    expect(groupByProject([], byLabel)).toEqual([{ project: DEFAULT_PROJECT_ID, items: [] }])
  })

  it('treats malformed or blank labels as unlabeled', () => {
    expect(projectLabel(undefined)).toBeNull()
    expect(projectLabel({ labels: null })).toBeNull()
    expect(projectLabel({ labels: ['project'] })).toBeNull()
    expect(projectLabel({ labels: { project: 42 } })).toBeNull()
    expect(projectLabel({ labels: { project: '  ' } })).toBeNull()
    expect(projectLabel({ labels: { project: 'bank_c360' } })).toBe('bank_c360')
  })
})
