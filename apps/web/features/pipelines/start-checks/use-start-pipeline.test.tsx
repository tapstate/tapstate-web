import '@/i18n/index'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { StartCheckReport } from '@/service/pipelines/pipeline-client'

import fixture from './__fixtures__/client-fixture-v1.json'
import { useStartPipeline } from './use-start-pipeline'

const { runPipeline, getStartChecks } = vi.hoisted(() => ({
  runPipeline: vi.fn(),
  getStartChecks: vi.fn(),
}))
vi.mock('@/service/pipelines/pipeline-client', () => ({ runPipeline, getStartChecks }))

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let current: ReturnType<typeof useStartPipeline>
let root: ReturnType<typeof createRoot> | undefined
let container: HTMLDivElement | undefined
function Harness() {
  current = useStartPipeline({ apiFetch: fetch })
  return null
}
afterEach(async () => {
  await act(async () => root?.unmount())
  container?.remove()
  vi.resetAllMocks()
})
async function blockedStart(report: StartCheckReport = fixture.unknownBehavior) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () => root?.render(<Harness />))
  runPipeline.mockRejectedValue({
    code: 'lifecycle.start-blocked',
    startChecks: report,
  })
  await act(async () => {
    void current.startPipeline('lead_view')
  })
  expect(current.dialog.open).toBe(true)
}
describe('rechecking a refused start', () => {
  it('fetches fresh checks without starting or carrying old answers', async () => {
    await blockedStart(fixture.answerable)
    const previous = [{ finding: fixture.answerable.findings[0]!.key, action: 'clear' }]
    runPipeline.mockRejectedValue({
      code: 'lifecycle.start-blocked',
      startChecks: fixture.answerable,
    })
    await act(async () => current.dialog.onConfirm(previous))
    expect(current.dialog.session?.decisions).toEqual(previous)
    getStartChecks.mockResolvedValue({ ...fixture.answerable, contentHash: 'new-definition' })
    await act(async () => current.dialog.onRecheck?.())
    expect(getStartChecks).toHaveBeenCalledWith('lead_view', 'start', fetch)
    expect(runPipeline).toHaveBeenCalledTimes(2)
    expect(current.dialog.session?.report.contentHash).toBe('new-definition')
    expect(current.dialog.session?.decisions).toEqual([])
    expect(current.dialog.session?.submitting).toBe(false)
    expect(current.dialog.open).toBe(true)
  })
  it('keeps the dialog recoverable when refreshing fails', async () => {
    await blockedStart()
    getStartChecks.mockRejectedValue(new Error('network'))
    await act(async () => current.dialog.onRecheck?.())
    expect(current.dialog.session?.recheckFailed).toBe(true)
    expect(current.dialog.session?.submitting).toBe(false)
    expect(current.dialog.open).toBe(true)
    await act(async () => current.dialog.onCancel())
    expect(current.dialog.open).toBe(false)
    expect(runPipeline).toHaveBeenCalledOnce()
  })
})
