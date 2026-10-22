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
      const trigger = host.querySelector<HTMLButtonElement>(
        '[aria-labelledby="wizard-destination-source-label"]',
      )
      expect(trigger).not.toBeNull()
      await act(async () => trigger?.click())
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
      button.textContent?.includes('AI cleaning'),
    )!
    act(() => helper.click())
    expect(onChange).not.toHaveBeenCalled()
    expect(
      host.querySelector<HTMLTextAreaElement>('textarea[aria-label="Pipeline assistant prompt"]')
        ?.value,
    ).toContain('focused table')
  })
  it('sends a blank-builder prompt from the Root Table card into the same review flow', async () => {
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
      Array.from(host.querySelectorAll('button'))
        .find((button) => button.textContent?.includes('Draft with AI'))
        ?.click()
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
    await act(async () =>
      host.querySelector<HTMLButtonElement>('button[aria-label="Table"]')!.click(),
    )
    const tableOption = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (item) => item.textContent?.includes('crm_orders'),
    )!
    await act(async () => tableOption.click())
    expect(host.querySelector('button[aria-label="Table"]')?.textContent).toContain('crm_orders')
    await act(async () => button('Review proposed').click())
    expect(button('Validate and apply').disabled).toBe(true)
    await act(async () => button('Validate and apply').click())
    expect(onApply).not.toHaveBeenCalled()
    expect(host.querySelector('button[aria-label="Table"]')?.textContent).toContain('crm_orders')
    expect(host.textContent).toContain('Save Changes')
  })
  it('adds the discovered table key as the independent array identity for a new array relation', async () => {
    const onChange = vi.fn()
    const host = renderBuilder({ onChange })
    const button = (text: string) =>
      [...host.querySelectorAll('button')].find((item) => item.textContent?.includes(text))!
    await act(async () => button('Add Related Table').click())
    await act(async () =>
      host.querySelector<HTMLButtonElement>('button[aria-label="Child Table"]')!.click(),
    )
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
    await act(async () =>
      host.querySelector<HTMLButtonElement>('button[aria-label="Table"]')!.click(),
    )
    const tableOption = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (item) => item.textContent?.includes('crm_orders'),
    )!
    await act(async () => tableOption.click())
    expect(button('Undo apply').disabled).toBe(true)
    expect(host.querySelector('button[aria-label="Table"]')?.textContent).toContain('crm_orders')
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
