import '@/i18n/index'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { StartCheckReport } from '@/service/pipelines/pipeline-client'
import type { ApiFetcher } from '@/service/source-client'

import { getStartChecks } from '@/service/pipelines/pipeline-client'

import type { StartChecksSession } from './use-start-pipeline'

import fixture from './__fixtures__/client-fixture-v1.json'
import { canStart, startBlocked, startDecisions } from './start-check-model'
import { StartChecksDialog } from './start-checks-dialog'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const answerable: StartCheckReport = fixture.answerable
const unknownBehavior: StartCheckReport = fixture.unknownBehavior
const unknownOutcome: StartCheckReport = fixture.unknownOutcome

let root: Root | undefined
let container: HTMLDivElement | undefined

afterEach(async () => {
  await act(async () => root?.unmount())
  container?.remove()
  root = undefined
  container = undefined
})

function session(report: StartCheckReport): StartChecksSession {
  return {
    pipelineId: report.pipelineId,
    version: 1,
    report,
    decisions: [],
    staleDecisions: [],
    changedWhileConfirming: false,
    submitting: false,
  }
}

async function renderDialog(report: StartCheckReport) {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () => {
    root?.render(
      <StartChecksDialog
        open
        session={session(report)}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    )
  })
  return { onConfirm, onCancel }
}

function dialog() {
  return document.querySelector<HTMLElement>('[data-testid="start-checks-dialog"]')
}

function button(text: string) {
  return [...(dialog()?.querySelectorAll<HTMLButtonElement>('button') ?? [])].find(
    (candidate) => candidate.textContent?.trim() === text,
  )
}

function radio(finding: string, action: string) {
  return dialog()?.querySelector<HTMLElement>(
    `[data-check-item="${finding}"] [data-check-choice="${action}"] [role="radio"]`,
  )
}

describe('Start-check client fixture', () => {
  it('is the version these tests were written against', () => {
    expect(fixture.fixtureVersion).toBe(1)
  })

  it('passes every report through the client unchanged, unknown values included', async () => {
    for (const report of [answerable, unknownBehavior, unknownOutcome]) {
      const fetcher: ApiFetcher = async () =>
        new Response(JSON.stringify(report), { headers: { 'Content-Type': 'application/json' } })
      await expect(getStartChecks(report.pipelineId, 'start', fetcher)).resolves.toEqual(report)
    }
  })

  it('renders every finding as written, with the values this client does not know as text', async () => {
    await renderDialog(answerable)

    expect(dialog()?.getAttribute('role')).toBe('alertdialog')
    const text = () => dialog()?.textContent ?? ''
    for (const finding of answerable.findings.filter(({ behavior }) => behavior !== 'PASS')) {
      expect(text()).toContain(finding.message)
      expect(text()).toContain(finding.subject.label)
      expect(text()).toContain(finding.subject.kind)
      expect(text()).toContain(finding.check)
      expect(text()).toContain(finding.evaluation)
      for (const action of finding.actions) {
        expect(text()).toContain(action.message)
        expect(text()).toContain(action.kind)
      }
    }
    for (const entry of answerable.plan) {
      expect(text()).toContain(entry.load)
      expect(text()).toContain(`${entry.target.connection} / ${entry.target.table}`)
    }

    const passed = answerable.findings.find(({ behavior }) => behavior === 'PASS')!
    expect(text()).not.toContain(passed.message)
    await act(async () => button('Show passed checks (1)')?.click())
    expect(text()).toContain(passed.message)

    const warning = dialog()?.querySelector('[data-check-item="source-retention/src_pg"]')
    expect(warning?.querySelector('[data-check-tone-label="warning"]')?.textContent).toBe('Warning')
    expect(warning?.querySelector('svg')).not.toBeNull()
    expect(dialog()?.querySelector('button[aria-label*="Close"]')).toBeNull()
  })

  it('previews what a destructive answer changes and styles it from its flag', async () => {
    await renderDialog(answerable)

    const clear = dialog()?.querySelector(
      '[data-check-item="target-not-empty/views/lead"] [data-check-choice="clear"]',
    )
    expect(clear?.getAttribute('data-destructive')).toBe('true')
    expect(clear?.querySelector('[data-check-choice-preview]')?.textContent).toContain(
      'lead: on_full_load append → clear',
    )
    expect(
      dialog()
        ?.querySelector(
          '[data-check-item="target-not-empty/views/lead"] [data-check-choice="keep"]',
        )
        ?.getAttribute('data-destructive'),
    ).toBeNull()
  })

  it('starts only once every question is answered, sending exactly the pairs the report names', async () => {
    const { onConfirm } = await renderDialog(answerable)

    expect(button('Cancel')).toBeDefined()
    expect(button('Start')?.disabled).toBe(true)
    await act(async () => radio('target-not-empty/views/lead', 'clear')?.click())
    expect(radio('target-not-empty/views/lead', 'clear')?.getAttribute('aria-checked')).toBe('true')
    expect(button('Start')?.disabled).toBe(true)
    await act(async () => radio('derived-schema-drift/join_orders', 'accept')?.click())
    expect(button('Start')?.disabled).toBe(false)

    await act(async () => button('Start')?.click())
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onConfirm).toHaveBeenCalledWith([
      { finding: 'target-not-empty/views/lead', action: 'clear' },
      { finding: 'derived-schema-drift/join_orders', action: 'accept' },
    ])
  })

  it('treats a behavior it does not know as refusing the start', async () => {
    expect(startBlocked(unknownBehavior)).toBe(true)
    expect(canStart(unknownBehavior, {})).toBe(false)
    const { onCancel, onConfirm } = await renderDialog(unknownBehavior)

    const finding = dialog()?.querySelector('[data-check-item="source-quarantine/src_pg"]')
    expect(finding?.querySelector('[data-check-tone-label="blocking"]')?.textContent).toBe(
      'Blocked',
    )
    expect(finding?.textContent).toContain('QUARANTINE')
    expect(finding?.textContent).toContain('src_pg is quarantined until an operator releases it.')
    expect(button('Start')).toBeUndefined()
    expect(button('Cancel')).toBeUndefined()

    await act(async () => button('Close')?.click())
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('treats an outcome it does not know as refusing the start', async () => {
    expect(startBlocked(unknownOutcome)).toBe(true)
    expect(startDecisions(unknownOutcome, {})).toEqual([])
    await renderDialog(unknownOutcome)

    expect(dialog()?.textContent).toContain('Something stops this start.')
    expect(button('Start')).toBeUndefined()
    expect(button('Close')).toBeDefined()
  })
})
