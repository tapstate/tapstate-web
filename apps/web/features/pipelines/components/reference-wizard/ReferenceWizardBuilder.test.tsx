import '@/i18n/index'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { PipelinePreviewRun } from '@/service/pipelines/pipeline-client'

import { ReferenceWizardBuilder, type WizardBuilderProps } from './ReferenceWizardBuilder'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let root: Root | undefined
let container: HTMLDivElement | undefined

afterEach(async () => {
  await act(async () => root?.unmount())
  container?.remove()
  root = undefined
  container = undefined
  vi.restoreAllMocks()
})

const preview: PipelinePreviewRun = {
  runId: 'preview-run',
  candidateHash: 'candidate-hash',
  format: 'mongo-extended-json',
  executionSpec: { pipelineId: 'customers' },
  contexts: [
    { id: 'root', kind: 'root', pointerPatterns: ['/customer_id', '/company_name'] },
    {
      id: 'orders',
      kind: 'relation',
      shape: 'array',
      path: 'orders',
      pointerPatterns: ['/orders'],
    },
    {
      id: 'sum_spend',
      kind: 'transform',
      type: 'map',
      effects: [
        {
          kind: 'computed',
          pointer: '/total_spent',
          annotation: 'map: sum(orders.amount)',
        },
      ],
      pointerPatterns: ['/total_spent'],
    },
  ],
  sample: { rootRows: 1, inputRows: 2, rootTruncated: false },
  documents: [
    {
      _id: { $oid: '65f0c1a4d09d3e5a48b10901' },
      customer_id: 'customer-1',
      company_name: 'Northwind',
      orders: [{ order_id: 'order-1' }],
      total_spent: 42,
    },
  ],
  trace: [],
  sampleId: 'sample-1',
  rowCount: 1,
  failure: null,
}

const relation = {
  id: 'orders',
  type: 'sub_array' as const,
  source: 'crm',
  table: 'crm_orders',
  key: 'customer_id',
  parentTable: 'crm_customers',
  parentKey: 'customer_id',
  targetField: 'orders',
  preProcessing: [],
  transforms: [],
  children: [],
  primaryKey: ['order_id'],
}

const renderInitial: WizardBuilderProps['initial'] = {
  root: {
    source: 'crm',
    table: 'crm_customers',
    primaryKey: 'customer_id',
    rowCount: '1',
    columns: ['customer_id', 'company_name'],
  },
  relations: [relation],
  transforms: [],
  destinationTable: 'customers',
  destinationSourceId: 'mongo',
  destinationWriteMode: 'upsert',
}

function renderBuilder(overrides: Partial<WizardBuilderProps> = {}) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  const props: WizardBuilderProps = {
    catalog: [
      {
        id: 'crm',
        name: 'crm',
        badge: 'CRM',
        connector: 'mysql',
        tables: [
          {
            name: 'crm_customers',
            primaryKey: 'customer_id',
            keys: ['customer_id'],
            discovered: true,
            rowCount: '1',
            columns: ['customer_id', 'company_name'],
          },
          {
            name: 'crm_orders',
            primaryKey: 'order_id',
            keys: ['order_id'],
            discovered: true,
            rowCount: '2',
            columns: ['order_id', 'customer_id'],
          },
        ],
      },
    ],
    initial: renderInitial,
    onChange: vi.fn(),
    destinationName: 'MongoDB',
    deploymentProfile: 'cloud',
    footer: <div>Draft actions</div>,
    compiledSpec: '{"pipelineId":"customers"}',
    livePreview: preview,
    livePreviewStatus: 'complete',
    livePreviewError: '',
    ...overrides,
  }
  act(() => root?.render(<ReferenceWizardBuilder {...props} />))
  return container
}

function previewPanel() {
  return container?.querySelector<HTMLElement>('.wizard-reference-preview')
}

describe('ReferenceWizardBuilder preview panel', () => {
  it('links root, relation, and transform focus to the streamed result', () => {
    const host = renderBuilder()
    const panel = previewPanel()
    expect(panel?.textContent).toContain('Root Anchor')

    const rootField = Array.from(panel?.querySelectorAll('span') ?? []).find(
      (element) => element.textContent === '"customer_id"',
    )
    expect(rootField?.className).toContain('font-semibold')
    expect(
      panel
        ?.querySelector('[data-preview-path="/customer_id"]')
        ?.getAttribute('data-preview-focused'),
    ).toBe('true')
    expect(
      panel?.querySelector('[data-preview-path="/orders"]')?.hasAttribute('data-preview-focused'),
    ).toBe(false)
    expect(panel?.querySelectorAll('[data-preview-focused="true"]')).toHaveLength(1)
    expect(
      panel?.querySelector('[data-preview-focused="true"]')?.getAttribute('data-preview-paths'),
    ).toBe('/customer_id,/company_name')
    act(() => {
      host
        ?.querySelector('.wizard-reference-relation-radius')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(panel?.textContent).toContain('(orders)')
    expect(
      panel?.querySelector('[data-preview-path="/orders"]')?.getAttribute('data-preview-focused'),
    ).toBe('true')
    expect(panel?.querySelectorAll('[data-preview-focused="true"]')).toHaveLength(1)
    expect(panel?.querySelector('[data-preview-focused="true"]')?.textContent).toContain('order-1')
    expect(panel?.querySelector('[data-preview-focused="true"]')?.textContent).not.toContain(
      'Northwind',
    )
    expect(
      panel
        ?.querySelector('[data-preview-path="/customer_id"]')
        ?.hasAttribute('data-preview-focused'),
    ).toBe(false)

    act(() => {
      host
        ?.querySelector<HTMLButtonElement>(
          '.wizard-reference-relation-radius button[title="Embed as nested document object {}"]',
        )
        ?.click()
    })
    expect(panel?.textContent).toContain('(orders)')

    act(() => {
      host
        ?.querySelector<HTMLButtonElement>(
          '.wizard-reference-relation-radius button[title="Remove relation"]',
        )
        ?.click()
    })
    expect(panel?.textContent).toContain('Root Anchor')

    act(() => {
      host
        ?.querySelector('#step-doc-process')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(panel?.textContent).toContain('Document Transforms')
    expect(panel?.textContent).toContain('map: sum(orders.amount)')
    expect(panel?.querySelectorAll('[data-preview-focused="true"]')).toHaveLength(1)
    expect(
      panel?.querySelector('[data-preview-focused="true"]')?.getAttribute('data-preview-paths'),
    ).toBe('/total_spent')
  })

  it('splits root focus when an unrelated relation interrupts document field order', () => {
    renderBuilder({
      livePreview: {
        ...preview,
        documents: [
          {
            customer_id: 'customer-1',
            orders: [{ order_id: 'order-1' }],
            company_name: 'Northwind',
          },
        ],
      },
    })
    const groups = previewPanel()?.querySelectorAll('[data-preview-focused="true"]')
    expect(groups).toHaveLength(2)
    expect(
      Array.from(groups || []).map((group) => group.getAttribute('data-preview-paths')),
    ).toEqual(['/customer_id', '/company_name'])
    expect(
      previewPanel()
        ?.querySelector('[data-preview-path="/orders"]')
        ?.hasAttribute('data-preview-focused'),
    ).toBe(false)
  })

  it('does not assign a shared root and flatten field to the flattened table', () => {
    const host = renderBuilder({
      initial: {
        ...renderInitial,
        relations: [{ ...relation, type: 'flatten' }],
      },
      livePreview: {
        ...preview,
        documents: [{ customer_id: 'customer-1', order_id: 'order-1' }],
      },
    })
    act(() => {
      host
        ?.querySelector('.wizard-reference-relation-radius')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(
      previewPanel()
        ?.querySelector('[data-preview-focused="true"]')
        ?.getAttribute('data-preview-paths'),
    ).toBe('/order_id')
    expect(previewPanel()?.querySelectorAll('[data-preview-focused="true"]')).toHaveLength(1)
  })

  it('focuses a nested relation through array indexes without highlighting its parent', () => {
    const nestedPreview: PipelinePreviewRun = {
      ...preview,
      contexts: [
        ...preview.contexts,
        {
          id: 'items',
          kind: 'relation',
          shape: 'array',
          path: 'orders/items',
          pointerPatterns: ['/orders/items'],
        },
      ],
      documents: [
        {
          ...preview.documents[0],
          orders: [{ order_id: 'order-1', items: [{ sku: 'item-1' }] }],
        },
      ],
    }
    const host = renderBuilder({
      initial: {
        ...renderInitial,
        relations: [
          {
            ...relation,
            children: [
              {
                ...relation,
                id: 'items',
                table: 'crm_items',
                targetField: 'items',
                parentTable: 'crm_orders',
                children: [],
              },
            ],
          },
        ],
      },
      livePreview: nestedPreview,
    })
    act(() => {
      host
        ?.querySelectorAll('.wizard-reference-relation-radius')[1]
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    const panel = previewPanel()
    expect(
      panel
        ?.querySelector('[data-preview-path="/orders/0/items"]')
        ?.getAttribute('data-preview-focused'),
    ).toBe('true')
    expect(
      panel?.querySelector('[data-preview-path="/orders"]')?.hasAttribute('data-preview-focused'),
    ).toBe(false)
    expect(panel?.querySelectorAll('[data-preview-focused="true"]')).toHaveLength(1)
    expect(panel?.querySelector('[data-preview-focused="true"]')?.textContent).toContain('item-1')
    expect(panel?.querySelector('[data-preview-focused="true"]')?.textContent).not.toContain(
      'order-1',
    )
    act(() => {
      Array.from(panel?.querySelectorAll('button') ?? [])
        .find((button) => button.textContent === 'Table View')
        ?.click()
    })
    expect(
      panel?.querySelector('td[data-preview-path="/orders"]')?.getAttribute('data-preview-focused'),
    ).toBe('true')
  })

  it('switches to a table without unpacking Extended JSON scalars and copies the compiled spec in place', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    renderBuilder()
    const panel = previewPanel()

    act(() => {
      Array.from(panel?.querySelectorAll('button') ?? [])
        .find((button) => button.textContent === 'Table View')
        ?.click()
    })
    expect(panel?.querySelector('table')?.textContent).toContain('_id')
    expect(panel?.querySelector('table')?.textContent).toContain('$oid')

    await act(async () => {
      Array.from(panel?.querySelectorAll('button') ?? [])
        .find((button) => button.textContent === 'Copy spec')
        ?.click()
      await Promise.resolve()
    })
    expect(writeText).toHaveBeenCalledWith('{"pipelineId":"customers"}')
    expect(panel?.textContent).toContain('Copied ✓')
  })
})
