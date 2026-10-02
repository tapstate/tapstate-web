import '@/i18n/index'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { WizardRelation } from '../model/pipeline-wizard-model'

import { WizardRelationCard } from './wizard-relation-card'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const relation: WizardRelation = {
  id: 'orders',
  sourceId: 'postgres',
  table: 'public.orders',
  parentId: 'root',
  shape: 'array',
  path: 'orders',
  key: ['id'],
  arrayKey: ['id'],
  conditions: [{ id: 'condition-1', childField: 'customer_id', parentField: 'id' }],
  transforms: [],
}

const fields = [
  { name: 'id', type: 'integer' },
  { name: 'customer_id', type: 'integer' },
]

let root: Root | undefined
let container: HTMLDivElement | undefined

afterEach(async () => {
  await act(async () => root?.unmount())
  container?.remove()
  root = undefined
  container = undefined
})

async function renderCard() {
  const onChangeShape = vi.fn()
  const onAddRelatedTable = vi.fn()
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)

  await act(async () => {
    root?.render(
      <WizardRelationCard
        relation={relation}
        childrenCount={1}
        sources={[
          {
            id: 'postgres',
            connector: 'postgres',
            connectorName: 'Postgres',
            tables: ['public.orders'],
            loadingTables: false,
          },
        ]}
        entities={[
          { id: 'root', sourceId: 'mysql', table: 'crm_customers', label: 'crm_customers', fields },
        ]}
        excludedEntityIds={new Set(['orders'])}
        childFields={fields}
        childSchemaLoading={false}
        processingSafe
        sourcesLoading={false}
        onChange={vi.fn()}
        onChangeShape={onChangeShape}
        onChangeSource={vi.fn()}
        onChangeTable={vi.fn()}
        onAddTransform={vi.fn()}
        onUpdateTransform={vi.fn()}
        onRemoveTransform={vi.fn()}
        onRemove={vi.fn()}
        onAddRelatedTable={onAddRelatedTable}
      >
        <div className="pipeline-wizard__relation-branch">Nested child</div>
      </WizardRelationCard>,
    )
  })

  return { onChangeShape, onAddRelatedTable }
}

describe('Wizard relation canvas card', () => {
  it('uses the reference card hierarchy and shows an upstream table in the condition', async () => {
    await renderCard()

    expect(container?.querySelector('.pipeline-wizard__relation-heading-main')).not.toBeNull()
    expect(container?.querySelector('.pipeline-wizard__nested-content')).not.toBeNull()
    expect(container?.textContent).toContain('public.orders')
    expect(container?.textContent).toContain('crm_customers')
    expect(container?.textContent).toContain('Nested child')
    expect(container?.textContent).not.toContain('Row identity')
  })

  it('adds a child inline and changes shape in the same card', async () => {
    const { onChangeShape, onAddRelatedTable } = await renderCard()

    const flatten = [...(container?.querySelectorAll<HTMLButtonElement>('button') ?? [])].find(
      (button) => button.textContent?.includes('Flatten'),
    )
    const addChild = [...(container?.querySelectorAll<HTMLButtonElement>('button') ?? [])].find(
      (button) => button.textContent?.includes('Add sub-relation'),
    )

    await act(async () => flatten?.click())
    await act(async () => addChild?.click())

    expect(onChangeShape).toHaveBeenCalledWith('flat')
    expect(onAddRelatedTable).toHaveBeenCalledWith('array')
  })
})
