import '@/i18n/index'
import { act, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { StartCheckReport } from '@/service/pipelines/pipeline-client'

import fixture from './__fixtures__/client-fixture-v1.json'
import { StartChecksDialog } from './start-checks-dialog'
import { useStartPipeline } from './use-start-pipeline'

const { runPipeline, getStartChecks } = vi.hoisted(() => ({
  runPipeline: vi.fn(),
  getStartChecks: vi.fn(),
}))
vi.mock('@/service/pipelines/pipeline-client', () => ({ runPipeline, getStartChecks }))

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: ReturnType<typeof createRoot> | undefined
let container: HTMLDivElement | undefined
const blocked: StartCheckReport = {
  ...fixture.answerable,
  outcome: 'BLOCKED',
  findings: [
    {
      ...fixture.answerable.findings[0]!,
      behavior: 'BLOCK',
      evaluation: 'UNAVAILABLE',
      actions: [],
    },
  ],
}
const ready: StartCheckReport = { ...blocked, outcome: 'READY', findings: [] }

function Harness({ showTrigger = true }: { showTrigger?: boolean }) {
  const returnFocus = useRef<HTMLButtonElement>(null)
  const starter = useStartPipeline({ apiFetch: fetch })
  const [busy, setBusy] = useState(false)
  return (
    <>
      {showTrigger && (
        <button
          ref={returnFocus}
          disabled={busy && starter.dialog.session === null}
          onClick={async () => {
            setBusy(true)
            try {
              await starter.startPipeline('lead_view', returnFocus)
            } finally {
              setBusy(false)
            }
          }}
        >
          Run
        </button>
      )}
      <StartChecksDialog {...starter.dialog} />
    </>
  )
}

function button(text: string) {
  return [...document.querySelectorAll<HTMLButtonElement>('button')].find(
    (candidate) => candidate.textContent?.trim() === text,
  )!
}

async function openAfterSlowRefusal() {
  let refuse!: (error: unknown) => void
  runPipeline.mockImplementationOnce(
    () =>
      new Promise((_resolve, reject) => {
        refuse = reject
      }),
  )
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () => root?.render(<Harness />))
  const trigger = button('Run')
  await act(async () => {
    trigger.focus()
    trigger.click()
  })
  expect(trigger.disabled).toBe(true)
  await act(async () => trigger.click())
  expect(runPipeline).toHaveBeenCalledOnce()
  // Browsers blur a disabled trigger; reproduce that loss before the async refusal arrives.
  trigger.blur()
  await act(async () => refuse({ code: 'lifecycle.start-blocked', startChecks: blocked }))
  await vi.waitFor(() => expect(button('Close')).toBeDefined())
  return trigger
}

afterEach(async () => {
  await act(async () => root?.unmount())
  container?.remove()
  vi.resetAllMocks()
})

describe('start-check focus return', () => {
  it.each(['Close', 'Escape'])('restores the re-enabled trigger after %s', async (dismissal) => {
    const trigger = await openAfterSlowRefusal()
    await act(async () => {
      if (dismissal === 'Close') button('Close').click()
      else
        document
          .querySelector('[role="alertdialog"]')
          ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    await vi.waitFor(() => expect(document.querySelector('[role="alertdialog"]')).toBeNull())
    await vi.waitFor(() => expect(document.activeElement).toBe(trigger))
    expect(trigger.disabled).toBe(false)
  })

  it('keeps the return target through failed and successful rechecks', async () => {
    const trigger = await openAfterSlowRefusal()
    getStartChecks.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(ready)
    await act(async () => button('Recheck').click())
    expect(document.body.textContent).toContain('Could not refresh the checks.')
    await act(async () => button('Recheck').click())
    expect(button('Start')).toBeDefined()
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull()
    expect(runPipeline).toHaveBeenCalledOnce()
    await act(async () => button('Cancel').click())
    await vi.waitFor(() => expect(document.activeElement).toBe(trigger))
  })

  it('does not dismiss during submission and returns focus after the start succeeds', async () => {
    const trigger = await openAfterSlowRefusal()
    getStartChecks.mockResolvedValueOnce(ready)
    await act(async () => button('Recheck').click())
    let complete!: (result: unknown) => void
    runPipeline.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          complete = resolve
        }),
    )
    await act(async () => button('Start').click())
    await act(async () =>
      document
        .querySelector('[role="alertdialog"]')
        ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
    )
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull()
    expect(button('Starting…').disabled).toBe(true)
    await act(async () => complete({ pipelineId: 'lead_view', startChecks: ready }))
    await vi.waitFor(() => expect(document.activeElement).toBe(trigger))
    expect(trigger.disabled).toBe(false)
    expect(runPipeline).toHaveBeenCalledTimes(2)
  })

  it('closes safely when the caller control was removed', async () => {
    const trigger = await openAfterSlowRefusal()
    await act(async () => root?.render(<Harness showTrigger={false} />))
    expect(trigger.isConnected).toBe(false)
    await act(async () => button('Close').click())
    await vi.waitFor(() => expect(document.querySelector('[role="alertdialog"]')).toBeNull())
    expect(document.activeElement?.isConnected).toBe(true)
    expect(document.activeElement).not.toBe(trigger)
  })
})
