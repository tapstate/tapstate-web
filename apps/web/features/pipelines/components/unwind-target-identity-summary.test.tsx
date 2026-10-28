import '@/i18n/index'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'

import type { PipelineTargetIdentity } from '@/service/pipelines/pipeline-client'

import { UnwindTargetIdentitySummary } from './unwind-target-identity-summary'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root | undefined
let container: HTMLDivElement | undefined
const automatic: PipelineTargetIdentity = {
  element: 'out',
  connection: 'atlas',
  table: 'orders',
  stream: 'orders',
  status: 'automatic',
  reason: 'generated-target-identity',
  sourceField: '_id',
  preservedField: '_unwind_source_id',
  writeKey: ['_unwind_source_id', 'TAG_NO'],
  generatedFields: ['_id'],
}

afterEach(async () => {
  await act(async () => root?.unmount())
  container?.remove()
  root = undefined
  container = undefined
})

async function render(status: 'complete' | 'stale' | 'error', plans?: PipelineTargetIdentity[]) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () =>
    root?.render(<UnwindTargetIdentitySummary enabled plans={plans} status={status} />),
  )
}

describe('unwind target identity feedback', () => {
  it('shows each target decision and the generated field without manufacturing an identifier', async () => {
    await render('complete', [
      automatic,
      {
        ...automatic,
        element: 'copy',
        connection: 'warehouse',
        status: 'not-required',
        sourceField: null,
        preservedField: null,
        generatedFields: [],
        writeKey: ['_id', 'TAG_NO'],
      },
    ])
    expect(container?.textContent).toContain('atlas / orders')
    expect(container?.textContent).toContain('warehouse / orders')
    expect(container?.textContent).toContain('_unwind_source_id + TAG_NO')
    expect(container?.querySelector('[role="alert"]')).toBeNull()
  })

  it('does not show a stale automatic decision while the new target is still being checked', async () => {
    await render('stale', [automatic])
    expect(container?.querySelector('[role="status"]')).not.toBeNull()
    expect(container?.textContent).not.toContain('atlas / orders')
  })

  it('places an actionable name collision in the target feedback', async () => {
    await render('error', [{ ...automatic, status: 'action-required', reason: 'field-collision' }])
    expect(container?.querySelector('[role="alert"]')?.textContent).toContain('_unwind_source_id')
  })
})
