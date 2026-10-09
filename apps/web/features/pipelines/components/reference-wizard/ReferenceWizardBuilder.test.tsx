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
    initial: {
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
    },
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
    expect(panel?.textContent).toContain('Root Table: crm_customers')

    const rootField = Array.from(panel?.querySelectorAll('span') ?? []).find(
      (element) => element.textContent === '"customer_id"',
    )
    expect(rootField?.className).toContain('font-semibold')

    act(() => {
      host
        ?.querySelector('.wizard-reference-relation-radius')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(panel?.textContent).toContain('Array: orders')

    act(() => {
      host
        ?.querySelector<HTMLButtonElement>(
          '.wizard-reference-relation-radius button[title="Embed as nested document object {}"]',
        )
        ?.click()
    })
    expect(panel?.textContent).toContain('Document: orders')

    act(() => {
      host
        ?.querySelector<HTMLButtonElement>(
          '.wizard-reference-relation-radius button[title="Remove relation"]',
        )
        ?.click()
    })
    expect(panel?.textContent).toContain('Root Table: crm_customers')

    act(() => {
      host
        ?.querySelector('#step-doc-process')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(panel?.textContent).toContain('Document Transforms')
    expect(panel?.textContent).toContain('map: sum(orders.amount)')
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
