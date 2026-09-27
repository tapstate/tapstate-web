import { describe, expect, it } from 'vitest'

import { groupByProject, hasProjectGroups, projectLabel } from './project-grouping'

interface Item {
  id: string
  metadata?: unknown
}

const byLabel = (item: Item) => projectLabel(item.metadata)

describe('groupByProject', () => {
  it('groups by label value sorted by project id and keeps unlabeled items last', () => {
    const items: Item[] = [
      { id: 'zeta_first', metadata: { labels: { project: 'bank_c360' } } },
      { id: 'bank_orders', metadata: { labels: { project: 'retail' } } },
      { id: 'legacy', metadata: null },
      { id: 'alpha_second', metadata: { labels: { project: 'bank_c360' } } },
      { id: 'no_labels', metadata: { description: 'x' } },
    ]

    const groups = groupByProject(items, byLabel)

    expect(groups.map((group) => group.project)).toEqual(['bank_c360', 'retail', null])
    expect(groups.map((group) => group.items.map((item) => item.id))).toEqual([
      ['zeta_first', 'alpha_second'],
      ['bank_orders'],
      ['legacy', 'no_labels'],
    ])
    expect(hasProjectGroups(groups)).toBe(true)
  })

  it('returns one unlabeled group in input order when nothing is labeled', () => {
    const items: Item[] = [{ id: 'b' }, { id: 'a', metadata: { labels: {} } }]

    const groups = groupByProject(items, byLabel)

    expect(groups).toEqual([{ project: null, items }])
    expect(hasProjectGroups(groups)).toBe(false)
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
