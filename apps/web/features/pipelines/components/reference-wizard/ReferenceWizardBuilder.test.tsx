import '@/i18n/index'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { PipelinePreviewRun } from '@/service/pipelines/pipeline-client'

import { useAuthStore } from '@/stores/auth-store'

import { ReferenceWizardBuilder, type WizardBuilderProps } from './ReferenceWizardBuilder'
import { relationKeysForTableChange } from './wizard-adapter'

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
      total_spent: { $numberLong: '9223372036854775807' },
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

async function setInputValue(input: HTMLInputElement, value: string) {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    setter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function getPickerOptions() {
  return Array.from(document.body.querySelectorAll<HTMLElement>('[role="option"]'))
}

async function openPicker(input: HTMLInputElement | null) {
  const trigger = input?.parentElement?.querySelector<HTMLButtonElement>(
    'button[aria-label="Open options"]',
  )
  await act(async () => trigger?.click())
}

describe('ReferenceWizardBuilder searchable pickers', () => {
  it('searches sources and tables in the input table picker', async () => {
    const host = renderBuilder({
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
        {
          id: 'archive',
          name: 'archive',
          badge: 'Archive',
          connector: 'postgres',
          tables: [
            {
              name: 'archive_events',
              primaryKey: 'event_id',
              discovered: true,
              rowCount: '4',
              columns: ['event_id', 'event_name'],
            },
          ],
        },
      ],
    })
    const button = (text: string) =>
      [...host.querySelectorAll('button')].find((item) => item.textContent?.includes(text))!

    await act(async () => button('Switch Table').click())
    await openPicker(host.querySelector<HTMLInputElement>('input[placeholder="Search sources"]'))
    await vi.waitFor(() =>
      expect(document.body.querySelector('input[placeholder="Search sources"]')).not.toBeNull(),
    )
    await setInputValue(
      document.body.querySelector<HTMLInputElement>('input[placeholder="Search sources"]')!,
      'archive',
    )
    await vi.waitFor(() =>
      expect(getPickerOptions().some((option) => option.textContent?.includes('archive'))).toBe(
        true,
      ),
    )
    await act(async () => getPickerOptions()[0]?.click())

    await openPicker(host.querySelector<HTMLInputElement>('input[placeholder="Search tables"]'))
    await vi.waitFor(() =>
      expect(document.body.querySelector('input[placeholder="Search tables"]')).not.toBeNull(),
    )
    await setInputValue(
      document.body.querySelector<HTMLInputElement>('input[placeholder="Search tables"]')!,
      'events',
    )
    await vi.waitFor(() => expect(getPickerOptions()).toHaveLength(1))
    expect(getPickerOptions()[0]?.textContent).toContain('archive_events')
  })

  it('searches relationship fields and automatically matches a unique shared field', async () => {
    const host = renderBuilder()
    const button = (text: string) =>
      [...host.querySelectorAll('button')].find((item) => item.textContent?.includes(text))!

    await act(async () => button('Add Related Table').click())
    const childTable = [
      ...host.querySelectorAll<HTMLInputElement>('input[placeholder="Search tables"]'),
    ].at(-1)!
    await openPicker(childTable)
    await vi.waitFor(() => expect(childTable).not.toBeNull())
    await setInputValue(childTable, 'orders')
    await vi.waitFor(() => expect(getPickerOptions()).toHaveLength(1))
    expect(getPickerOptions()[0]?.textContent).toContain('crm_orders')
    await act(async () => getPickerOptions()[0]?.click())

    const childField = [
      ...host.querySelectorAll<HTMLInputElement>('input[aria-label="Related table field"]'),
    ].at(-1)
    const parentField = [
      ...host.querySelectorAll<HTMLInputElement>('input[aria-label="Existing Pipeline field"]'),
    ].at(-1)
    expect(childField?.value).toBe('customer_id')
    expect(parentField?.value).toBe('customer_id')

    await openPicker(childField ?? null)
    await vi.waitFor(() =>
      expect(document.body.querySelector('input[placeholder="Search fields"]')).not.toBeNull(),
    )
    await setInputValue(childField!, 'order')
    await vi.waitFor(() => expect(getPickerOptions()).toHaveLength(1))
    expect(getPickerOptions()[0]?.textContent).toContain('order_id')
    expect(getPickerOptions()[0]?.textContent).toContain('PK')
    await setInputValue(childField!, 'custom_join')
    expect(childField?.value).toBe('custom_join')
  })

  it('uses the selected root source when another source has a same-named table', async () => {
    const host = renderBuilder({
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
        {
          id: 'archive',
          name: 'archive',
          badge: 'Archive',
          connector: 'postgres',
          tables: [
            {
              name: 'crm_customers',
              primaryKey: 'archive_customer_id',
              keys: ['archive_customer_id'],
              discovered: true,
              rowCount: '1',
              columns: ['archive_customer_id', 'archive_name'],
            },
          ],
        },
      ],
      initial: {
        ...renderInitial,
        root: {
          ...renderInitial.root!,
          source: 'archive',
          columns: ['archive_customer_id', 'archive_name'],
          primaryKey: 'archive_customer_id',
        },
        relations: [
          {
            ...relation,
            conditions: [
              {
                childKey: 'customer_id',
                parentTable: 'crm_customers',
                parentKey: 'archive_customer_id',
                operator: '=',
              },
            ],
          },
        ],
      },
    })
    const parentField = host.querySelector<HTMLInputElement>(
      'input[aria-label="Existing Pipeline field"]',
    )

    await openPicker(parentField)
    await setInputValue(parentField!, 'archive_name')
    await vi.waitFor(() =>
      expect(getPickerOptions().map((option) => option.textContent?.trim())).toContain(
        'archive_name',
      ),
    )
  })

  it('searches fields and parent tables when editing an existing relation', async () => {
    const host = renderBuilder()
    const childField = host.querySelector<HTMLInputElement>(
      'input[aria-label="Related table field"]',
    )

    await openPicker(childField ?? null)
    await vi.waitFor(() =>
      expect(document.body.querySelector('input[placeholder="Search fields"]')).not.toBeNull(),
    )
    await setInputValue(childField!, 'customer')
    await vi.waitFor(() =>
      expect(getPickerOptions().map((option) => option.textContent)).toEqual(['customer_id']),
    )
    await act(async () => getPickerOptions()[0]?.click())

    await openPicker(host.querySelector<HTMLInputElement>('input[aria-label="Parent table"]'))
    await vi.waitFor(() =>
      expect(document.body.querySelector('input[placeholder="Search tables"]')).not.toBeNull(),
    )
    await setInputValue(
      document.body.querySelector<HTMLInputElement>('input[placeholder="Search tables"]')!,
      'customers',
    )
    await vi.waitFor(() => expect(getPickerOptions()).toHaveLength(1))
    expect(getPickerOptions()[0]?.textContent).toContain('crm_customers')
  })

  it('automatically matches a nested relation to its parent table after table selection', async () => {
    const host = renderBuilder({
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
            {
              name: 'crm_order_lines',
              primaryKey: 'line_id',
              keys: ['line_id'],
              discovered: true,
              rowCount: '3',
              columns: ['line_id', 'order_id'],
            },
          ],
        },
      ],
    })
    const nestedAdd = [...host.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Add Sub-relation to crm_orders'),
    )

    await act(async () => nestedAdd?.click())
    const nestedTable = [
      ...host.querySelectorAll<HTMLInputElement>('input[placeholder="Search tables"]'),
    ].at(-1)!
    await openPicker(nestedTable)
    await vi.waitFor(() => expect(getPickerOptions().length).toBeGreaterThan(0))
    const tableOption = getPickerOptions().find((option) =>
      option.textContent?.includes('crm_order_lines'),
    )
    await act(async () => tableOption?.click())

    const childField = [
      ...host.querySelectorAll<HTMLInputElement>('input[aria-label="Related table field"]'),
    ].at(-1)
    const parentField = [
      ...host.querySelectorAll<HTMLInputElement>('input[aria-label="Existing Pipeline field"]'),
    ].at(-1)
    expect(childField?.value).toBe('order_id')
    expect(parentField?.value).toBe('order_id')
  })

  it('preserves composite join conditions when changing the related table', async () => {
    const host = renderBuilder({
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
              columns: ['customer_id', 'company_name', 'tenant_id'],
            },
            {
              name: 'crm_orders',
              primaryKey: 'order_id',
              keys: ['order_id'],
              discovered: true,
              rowCount: '2',
              columns: ['order_id', 'customer_id', 'tenant_id'],
            },
            {
              name: 'crm_invoices',
              primaryKey: 'invoice_id',
              keys: ['invoice_id'],
              discovered: true,
              rowCount: '3',
              columns: ['invoice_id', 'customer_id', 'tenant_id'],
            },
          ],
        },
      ],
      initial: {
        ...renderInitial,
        root: {
          ...renderInitial.root!,
          columns: ['customer_id', 'company_name', 'tenant_id'],
        },
        relations: [
          {
            ...relation,
            isTableEditing: true,
            conditions: [
              {
                childKey: 'customer_id',
                parentTable: 'crm_customers',
                parentKey: 'customer_id',
                operator: '=',
              },
              {
                childKey: 'tenant_id',
                parentTable: 'crm_customers',
                parentKey: 'tenant_id',
                operator: '=',
              },
            ],
          },
        ],
      },
    })
    const tablePicker = host.querySelector<HTMLInputElement>('input[placeholder="Search tables"]')

    await openPicker(tablePicker)
    await vi.waitFor(() => expect(getPickerOptions().length).toBeGreaterThan(0))
    const invoiceOption = getPickerOptions().find((option) =>
      option.textContent?.includes('crm_invoices'),
    )
    await act(async () => invoiceOption?.click())

    const childFields = [
      ...host.querySelectorAll<HTMLInputElement>('input[aria-label="Related table field"]'),
    ]
    const parentFields = [
      ...host.querySelectorAll<HTMLInputElement>('input[aria-label="Existing Pipeline field"]'),
    ]
    expect(childFields.map((input) => input.value)).toEqual(['customer_id', 'tenant_id'])
    expect(parentFields.map((input) => input.value)).toEqual(['customer_id', 'tenant_id'])
  })

  it('matches nested fields against the selected parent when its table name matches the root', async () => {
    const host = renderBuilder({
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
          ],
        },
        {
          id: 'archive',
          name: 'archive',
          badge: 'Archive',
          connector: 'postgres',
          tables: [
            {
              name: 'crm_customers',
              primaryKey: 'archive_customer_id',
              keys: ['archive_customer_id'],
              discovered: true,
              rowCount: '1',
              columns: ['archive_customer_id', 'archive_name'],
            },
            {
              name: 'archive_children',
              primaryKey: 'id',
              keys: ['id'],
              defaultKey: 'id',
              discovered: true,
              rowCount: '2',
              columns: ['id', 'archive_customer_id', 'customer_id'],
            },
          ],
        },
      ],
      initial: {
        ...renderInitial,
        relations: [
          {
            ...relation,
            id: 'archive-parent',
            source: 'archive',
            table: 'crm_customers',
            key: 'archive_customer_id',
            primaryKey: ['archive_customer_id'],
          },
        ],
      },
    })
    const nestedAdd = [...host.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Add Sub-relation to crm_customers'),
    )

    await act(async () => nestedAdd?.click())
    const nestedTable = [
      ...host.querySelectorAll<HTMLInputElement>('input[placeholder="Search tables"]'),
    ].at(-1)!
    await openPicker(nestedTable)
    await vi.waitFor(() => expect(getPickerOptions().length).toBeGreaterThan(0))
    const tableOption = getPickerOptions().find((option) =>
      option.textContent?.includes('archive_children'),
    )
    await act(async () => tableOption?.click())

    const childField = [
      ...host.querySelectorAll<HTMLInputElement>('input[aria-label="Related table field"]'),
    ].at(-1)
    const parentField = [
      ...host.querySelectorAll<HTMLInputElement>('input[aria-label="Existing Pipeline field"]'),
    ].at(-1)
    expect(childField?.value).toBe('archive_customer_id')
    expect(parentField?.value).toBe('archive_customer_id')
  })
})

describe('ReferenceWizardBuilder union transform choices', () => {
  it('offers union inputs from an available source outside the current pipeline scope', async () => {
    const host = renderBuilder({
      catalog: [
        {
          id: 'crm',
          name: 'crm',
          badge: 'CRM',
          connector: 'mysql',
          sink: true,
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
        {
          id: 'archive',
          name: 'archive',
          badge: 'Archive',
          connector: 'postgres',
          sink: true,
          tables: [
            {
              name: 'archive_orders',
              primaryKey: 'order_id',
              keys: ['order_id'],
              discovered: true,
              rowCount: '4',
              columns: ['order_id', 'customer_id'],
            },
          ],
        },
      ],
    })

    const pipelineTransforms = host.querySelector('#step-doc-process')
    const addTransform = [...(pipelineTransforms?.querySelectorAll('button') || [])].find(
      (button) => button.textContent?.includes('Add transform'),
    )
    await act(async () => addTransform?.click())

    const union = [...(pipelineTransforms?.querySelectorAll('button') || [])].find((button) =>
      button.textContent?.includes('Union'),
    )
    expect(union?.disabled).toBe(false)
    await act(async () => union?.click())
    expect(pipelineTransforms?.textContent).toContain('archive_orders')
    expect(pipelineTransforms?.textContent).toContain('archive')
    expect(pipelineTransforms?.querySelector('.connector-icon')).not.toBeNull()
  })
})

describe('unwind identity across wizard sections', () => {
  it.each([false, true])('matches inherited execution with relations=%s', (withRelations) => {
    const panel = renderBuilder({
      initial: {
        ...renderInitial,
        root: {
          ...renderInitial.root!,
          transforms: [
            {
              id: 'root_unwind',
              name: 'Unwind',
              type: 'unwind',
              config: {
                unwind: {
                  path: 'items',
                  include_array_index: 'position',
                  source_id_field: 'parent_id',
                },
              },
            },
          ],
        },
        relations: withRelations ? [relation] : [],
        transforms: [
          {
            id: 'pipeline_unwind',
            name: 'Unwind',
            type: 'unwind',
            isExpanded: true,
            config: { unwind: { path: 'nested', include_array_index: 'nested_position' } },
          },
        ],
      },
    })
    const inputs = Array.from(panel.querySelectorAll<HTMLInputElement>('details input'))
    expect(inputs.at(-1)?.value).toBe(withRelations ? '_unwind_source_id' : 'parent_id')
  })
})

describe('ReferenceWizardBuilder destination picker', () => {
  it.each(['cloud', 'on-prem'] as const)(
    'enforces the %s destination policy in the real picker',
    async (profile) => {
      const host = renderBuilder({
        deploymentProfile: profile,
        catalog: [
          {
            id: 'mongo_out',
            name: 'Local Mongo output',
            badge: 'Mongo',
            connector: 'mongodb',
            sink: true,
            tables: [],
          },
          {
            id: 'atlas_out',
            name: 'Atlas output',
            badge: 'Atlas',
            connector: 'mongodb-atlas',
            sink: true,
            tables: [],
          },
          {
            id: 'readonly_atlas',
            name: 'Read-only Atlas',
            badge: 'Atlas',
            connector: 'mongodb-atlas',
            sink: false,
            tables: [],
          },
        ],
        initial: { ...renderInitial, destinationSourceId: 'atlas_out' },
      })
      const trigger = host.querySelector<HTMLInputElement>(
        'input[aria-labelledby="wizard-destination-source-label"]',
      )
      expect(trigger).not.toBeNull()
      await openPicker(trigger)
      await vi.waitFor(() =>
        expect(document.body.querySelectorAll('[role="option"]').length).toBeGreaterThan(0),
      )
      const options = Array.from(document.body.querySelectorAll('[role="option"]')).map(
        (item) => item.textContent,
      )
      expect(options.some((text) => text?.includes('Atlas output'))).toBe(true)
      expect(options.some((text) => text?.includes('Read-only Atlas'))).toBe(false)
      expect(options.some((text) => text?.includes('Local Mongo output'))).toBe(
        profile === 'on-prem',
      )
    },
  )
})

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

  it('switches between materialized logical rows and the projected target write result', () => {
    renderBuilder({
      initial: {
        ...renderInitial,
        transforms: [
          {
            id: 'expanded',
            name: 'Expand items',
            type: 'unwind',
            isExpanded: true,
            config: { unwind: { path: 'items', include_array_index: 'item_no' } },
          },
        ],
      },
      livePreview: {
        ...preview,
        documents: [{ _unwind_source_id: 'parent-1', item_no: 0, items: 'a' }],
        logicalDocuments: [{ _id: 'parent-1', item_no: 0, items: 'a' }],
      },
    })
    const panel = previewPanel()
    expect(panel?.querySelector('[data-preview-path="/_unwind_source_id"]')).not.toBeNull()
    expect(panel?.querySelector('[data-preview-path="/_id"]')).toBeNull()
    const logical = Array.from(panel?.querySelectorAll('button') || []).find(
      (button) => button.textContent === 'Logical operator result',
    )
    expect(logical).toBeDefined()
    act(() => logical?.click())
    expect(logical?.getAttribute('aria-pressed')).toBe('true')
    expect(panel?.querySelector('[data-preview-path="/_id"]')).not.toBeNull()
    expect(panel?.querySelector('[data-preview-path="/_unwind_source_id"]')).toBeNull()
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

  it('shows Extended JSON scalars as readable values without losing long integer precision', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    renderBuilder()
    const panel = previewPanel()
    expect(panel?.textContent).toContain('9223372036854775807')
    expect(panel?.textContent).not.toContain('$numberLong')
    expect(panel?.querySelector('[data-preview-path="/total_spent"]')?.className).not.toContain(
      'border',
    )

    act(() => {
      Array.from(panel?.querySelectorAll('button') ?? [])
        .find((button) => button.textContent === 'Table View')
        ?.click()
    })
    expect(panel?.querySelector('table')?.textContent).toContain('_id')
    expect(panel?.querySelector('table')?.textContent).toContain('65f0c1a4d09d3e5a48b10901')
    expect(panel?.querySelector('table')?.textContent).toContain('9223372036854775807')
    expect(panel?.querySelector('table')?.textContent).not.toContain('$numberLong')

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

describe('ReferenceWizardBuilder assistant isolation', () => {
  it('defaults to the Builder Copilot tab and helpers do not mutate the editor', () => {
    const onChange = vi.fn()
    const host = renderBuilder({
      showWorkbenchHeader: true,
      onChange,
      assistant: { pipelineId: 'customers', revision: 1, blocked: false, onApply: vi.fn() },
    })
    expect(host.querySelector('.wizard-reference-assistant')).not.toBeNull()
    expect(previewPanel()?.classList.contains('hidden')).toBe(true)
    expect(previewPanel()?.classList.contains('flex')).toBe(false)
    const helper = [...host.querySelectorAll('button')].find((button) =>
      button.getAttribute('aria-label')?.includes('AI cleaning'),
    )!
    act(() => helper.click())
    expect(onChange).not.toHaveBeenCalled()
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Scope:')
    expect(
      document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Your request"]')?.value,
    ).toBe('')
    expect(
      host.querySelector<HTMLTextAreaElement>('textarea[aria-label="Pipeline assistant prompt"]')
        ?.value,
    ).toBe('')
  })
  it('sends a blank-builder prompt from the Input Table card into the same review flow', async () => {
    const promptText = 'Sync PostgreSQL orders to MySQL and keep customer totals up to date.'
    const apiFetch = vi.fn().mockResolvedValue(
      new Response(
        [
          { type: 'start', messageId: 'root-prompt' },
          { type: 'text-start', id: 'root-reply' },
          { type: 'text-delta', id: 'root-reply', delta: 'I will draft that pipeline.' },
          { type: 'text-end', id: 'root-reply' },
          { type: 'finish', finishReason: 'stop' },
        ]
          .map((event) => `data: ${JSON.stringify(event)}\n\n`)
          .join('') + 'data: [DONE]\n\n',
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'x-vercel-ai-ui-message-stream': 'v1',
          },
        },
      ),
    )
    const onApply = vi.fn()
    const prepareRequest = vi.fn().mockResolvedValue(2)
    useAuthStore.setState({ apiFetch })
    const host = renderBuilder({
      initial: { ...renderInitial, root: null, relations: [] },
      assistant: {
        pipelineId: 'customers',
        revision: 1,
        blocked: true,
        sendBlocked: false,
        prepareRequest,
        onApply,
      },
    })
    const prompt = host.querySelector<HTMLTextAreaElement>(
      'textarea[aria-label="Describe the pipeline you want to build"]',
    )!
    const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
    act(() => {
      setValue?.call(prompt, promptText)
      prompt.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(host.textContent).toContain('Or choose a source and table manually')
    await act(async () => {
      host.querySelector<HTMLButtonElement>('form button[aria-label="Send"]')?.click()
      await Promise.resolve()
    })
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalledOnce())
    expect(prepareRequest).toHaveBeenCalledOnce()
    expect(apiFetch).toHaveBeenCalledOnce()
    expect(apiFetch.mock.calls[0][0]).toBe('/api/pipelines/customers/draft:assistant')
    expect(JSON.parse(apiFetch.mock.calls[0][1].body)).toMatchObject({
      revision: 2,
      focus: { kind: 'root', nodeId: 'root' },
      messages: [{ role: 'user', text: promptText }],
    })
    expect(host.querySelector('.wizard-reference-sidebar')?.classList.contains('hidden')).toBe(
      false,
    )
    expect(onApply).not.toHaveBeenCalled()
  })
  it('preserves an unconfirmed root selection when a previously generated proposal is reviewed', async () => {
    const onApply = vi.fn()
    const candidate = { ...renderInitial, destinationTable: 'suggested_destination' }
    const events = [
      { type: 'start', messageId: 'root-edit-proposal' },
      {
        type: 'data-proposal',
        data: {
          baseRevision: 1,
          candidateWizard: candidate,
          validation: { valid: true },
          diff: { changes: [] },
        },
      },
      { type: 'finish', finishReason: 'stop' },
    ]
    useAuthStore.setState({
      apiFetch: vi.fn().mockResolvedValue(
        new Response(
          events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('') + 'data: [DONE]\n\n',
          {
            headers: {
              'Content-Type': 'text/event-stream',
              'x-vercel-ai-ui-message-stream': 'v1',
            },
          },
        ),
      ),
    })
    const host = renderBuilder({
      showWorkbenchHeader: true,
      assistant: { pipelineId: 'customers', revision: 1, blocked: false, onApply },
    })
    const button = (text: string) =>
      [...host.querySelectorAll('button')].find((item) => item.textContent?.includes(text))!
    await act(async () => button('Infer parent').click())
    expect(host.textContent).toContain('Review proposed pipeline changes')
    await act(async () => button('Switch Table').click())
    const rootTable = host.querySelector<HTMLInputElement>('input[aria-label="Input table"]')!
    await openPicker(rootTable)
    await vi.waitFor(() => expect(getPickerOptions().length).toBeGreaterThan(0))
    const tableOption = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (item) => item.textContent?.includes('crm_orders'),
    )!
    await act(async () => tableOption.click())
    expect(rootTable.value).toContain('crm_orders')
    await act(async () => button('Review proposed').click())
    expect(button('Validate and apply').disabled).toBe(true)
    await act(async () => button('Validate and apply').click())
    expect(onApply).not.toHaveBeenCalled()
    expect(rootTable.value).toContain('crm_orders')
    expect(host.textContent).toContain('Save Changes')
  })
  it('adds the discovered table key as the independent array identity for a new array relation', async () => {
    const onChange = vi.fn()
    const host = renderBuilder({ onChange })
    const button = (text: string) =>
      [...host.querySelectorAll('button')].find((item) => item.textContent?.includes(text))!
    await act(async () => button('Add Related Table').click())
    await openPicker(
      [...host.querySelectorAll<HTMLInputElement>('input[placeholder="Search tables"]')].at(-1) ??
        null,
    )
    await vi.waitFor(() => expect(getPickerOptions().length).toBeGreaterThan(0))
    const tableOption = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (item) => item.textContent?.includes('crm_orders'),
    )!
    await act(async () => tableOption.click())
    await act(async () => button('Embed Relation').click())
    const latest = onChange.mock.calls.at(-1)?.[0]
    expect(latest.relations.at(-1)).toMatchObject({
      primaryKey: ['order_id'],
      arrayKey: ['order_id'],
    })
  })
  it('initializes array identity when an existing relation changes to array shape', async () => {
    const onChange = vi.fn()
    const host = renderBuilder({
      onChange,
      initial: { ...renderInitial, relations: [{ ...relation, type: 'sub_doc', arrayKey: [] }] },
    })
    const card = host.querySelector<HTMLElement>('.wizard-reference-relation-radius')!
    await act(async () =>
      card
        .querySelector<HTMLButtonElement>('button[title="Embed as array of documents []"]')!
        .click(),
    )
    const latest = onChange.mock.calls.at(-1)?.[0]
    expect(latest.relations[0]).toMatchObject({ type: 'sub_array', arrayKey: ['order_id'] })
  })
  it('recomputes array identity from the active table after shape and table changes', () => {
    const customers = {
      name: 'crm_customers',
      primaryKey: 'customer_id',
      keys: ['customer_id'],
      rowCount: '1',
      columns: ['customer_id', 'company_name'],
    }
    expect(relationKeysForTableChange('sub_doc', customers)).toEqual({
      primaryKey: ['customer_id'],
      arrayKey: [],
    })
    expect(relationKeysForTableChange('sub_array', customers)).toEqual({
      primaryKey: ['customer_id'],
      arrayKey: ['customer_id'],
    })
  })
  it('undoes the applied assistant transaction while the Builder remains unchanged', async () => {
    const onApply = vi.fn()
    const candidate = { ...renderInitial, destinationTable: 'suggested_destination' }
    const events = [
      { type: 'start', messageId: 'undo-proposal' },
      {
        type: 'data-proposal',
        data: {
          baseRevision: 1,
          candidateWizard: candidate,
          validation: { valid: true },
          diff: { changes: [] },
        },
      },
      { type: 'finish', finishReason: 'stop' },
    ]
    const apiFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('') + 'data: [DONE]\n\n',
          {
            headers: { 'Content-Type': 'text/event-stream', 'x-vercel-ai-ui-message-stream': 'v1' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ valid: true, candidateWizard: candidate, diff: { changes: [] } }),
        ),
      )
    useAuthStore.setState({ apiFetch })
    const host = renderBuilder({
      showWorkbenchHeader: true,
      assistant: { pipelineId: 'customers', revision: 1, blocked: false, onApply },
    })
    const button = (text: string) =>
      [...host.querySelectorAll('button')].find((item) => item.textContent?.includes(text))!
    await act(async () => button('Infer parent').click())
    await act(async () => button('Review proposed').click())
    await act(async () => button('Validate and apply').click())
    expect(onApply).toHaveBeenCalledExactlyOnceWith(candidate)
    await act(async () => button('Switch Table').click())
    const rootTable = host.querySelector<HTMLInputElement>('input[aria-label="Input table"]')!
    await openPicker(rootTable)
    const tableOption = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (item) => item.textContent?.includes('crm_orders'),
    )!
    await act(async () => tableOption.click())
    expect(button('Undo apply').disabled).toBe(true)
    expect(rootTable.value).toContain('crm_orders')
    expect(onApply).toHaveBeenCalledExactlyOnceWith(candidate)
  })
  it('undoes the applied assistant transaction when no editor selection is pending', async () => {
    const onApply = vi.fn()
    const candidate = { ...renderInitial, destinationTable: 'suggested_destination' }
    const events = [
      { type: 'start', messageId: 'undo-proposal' },
      {
        type: 'data-proposal',
        data: {
          baseRevision: 1,
          candidateWizard: candidate,
          validation: { valid: true },
          diff: { changes: [] },
        },
      },
      { type: 'finish', finishReason: 'stop' },
    ]
    const apiFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('') + 'data: [DONE]\n\n',
          {
            headers: { 'Content-Type': 'text/event-stream', 'x-vercel-ai-ui-message-stream': 'v1' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ valid: true, candidateWizard: candidate, diff: { changes: [] } }),
        ),
      )
    useAuthStore.setState({ apiFetch })
    const host = renderBuilder({
      showWorkbenchHeader: true,
      assistant: { pipelineId: 'customers', revision: 1, blocked: false, onApply },
    })
    const button = (text: string) =>
      [...host.querySelectorAll('button')].find((item) => item.textContent?.includes(text))!
    await act(async () => button('Infer parent').click())
    await act(async () => button('Review proposed').click())
    await act(async () => button('Validate and apply').click())
    expect(onApply).toHaveBeenCalledExactlyOnceWith(candidate)
    await act(async () => button('Undo apply').click())
    expect(onApply).toHaveBeenNthCalledWith(2, renderInitial)
    expect(host.textContent).not.toContain('Review proposed pipeline changes')
  })
  it('switches the single sidebar between Copilot and preview without losing preview mode or documents', () => {
    const host = renderBuilder({
      showWorkbenchHeader: true,
      assistant: { pipelineId: 'customers', revision: 1, blocked: false, onApply: vi.fn() },
    })
    const sidebar = host.querySelector('.wizard-reference-sidebar')!
    expect(sidebar.tagName).toBe('ASIDE')
    expect(
      host.querySelector('[data-testid="wizard-workbench-header"]')?.textContent,
    ).not.toContain('AI assistant')
    const tabs = [...sidebar.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
    expect(tabs[0].getAttribute('aria-selected')).toBe('true')
    const preview = previewPanel()!
    act(() => tabs[1].click())
    expect(preview.classList.contains('hidden')).toBe(false)
    act(() =>
      [...preview.querySelectorAll('button')]
        .find((button) => button.textContent === 'Table View')!
        .click(),
    )
    expect(preview.querySelector('table')?.textContent).toContain('Northwind')
    const table = preview.querySelector('table')
    act(() => tabs[0].click())
    expect(preview.classList.contains('hidden')).toBe(true)
    act(() => tabs[1].click())
    expect(preview.querySelector('table')).toBe(table)
    expect(preview.querySelector('table')?.textContent).toContain('Northwind')
    act(() =>
      sidebar
        .querySelector<HTMLButtonElement>(':scope > div > button[aria-label="Close AI assistant"]')!
        .click(),
    )
    expect(sidebar.classList.contains('hidden')).toBe(true)
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', metaKey: true })))
    expect(sidebar.classList.contains('hidden')).toBe(false)
    expect(preview.querySelector('table')).toBe(table)
  })
})
