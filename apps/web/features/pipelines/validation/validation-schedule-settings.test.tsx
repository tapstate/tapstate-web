import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type {
  createValidationClient,
  ValidationPreview,
  ValidationSchedule,
  ValidationTask,
} from '@/service/pipelines/validation-client'

import { ValidationScheduleSettings } from './validation-schedule-settings'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root | undefined
let container: HTMLDivElement | undefined
afterEach(async () => {
  await act(async () => root?.unmount())
  container?.remove()
  root = undefined
  container = undefined
})
function button(label: string): HTMLButtonElement {
  const found = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
    (value) => value.textContent === label,
  )
  if (!found) throw new Error(`Button not rendered: ${label}`)
  return found
}
function field(label: string): HTMLInputElement {
  const found = [...document.querySelectorAll<HTMLLabelElement>('label')].find(
    (value) => value.textContent === label,
  )
  const input = found?.htmlFor ? document.getElementById(found.htmlFor) : null
  if (!(input instanceof HTMLInputElement)) throw new Error(`Field not rendered: ${label}`)
  return input
}
async function change(label: string, value: string) {
  await act(async () => {
    const input = field(label)
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
async function click(label: string) {
  await act(async () => button(label).click())
}
async function settled(assertion: () => void) {
  await vi.waitFor(
    async () => {
      await act(async () => {})
      assertion()
    },
    { timeout: 1500, interval: 10 },
  )
}

const schedule: ValidationSchedule = {
  kind: 'CRON',
  every: null,
  unit: null,
  anchor: null,
  expression: '0 2 * * *',
  zoneId: 'Asia/Shanghai',
}
const task = (value: ValidationSchedule = schedule): ValidationTask => ({
  pipelineId: 'flow',
  taskId: 'full',
  taskGeneration: '10000000-0000-4000-8000-000000000001',
  revision: '1',
  nextStartSequence: '1',
  closed: false,
  method: 'COUNT',
  comparisonFingerprint: 'a'.repeat(64),
  historyLimit: 10,
  schedule: value,
  scheduleEnabled: true,
  mappings: [],
  context: null,
  permission: null,
  scheduleObservation: null,
})
function preview(
  input: { schedule: ValidationSchedule; inputRevision: string },
  marker = 'current',
): ValidationPreview {
  return {
    base: '2026-10-30T00:00:00Z',
    inputRevision: input.inputRevision,
    zoneId: input.schedule.zoneId,
    rulesVersion: 'validation-unix-v1',
    occurrences: Array.from({ length: 5 }, (_, i) => ({
      at: `2026-11-0${i + 1}T00:00:00Z`,
      local: `${marker}-${i}`,
      offset: '+08:00',
      weekday: 'MONDAY',
    })),
  }
}
async function fixture(
  value = task(),
  read = vi.fn(async (input: { schedule: ValidationSchedule; inputRevision: string }) =>
    preview(input),
  ),
) {
  const client = { previewSchedule: read } as unknown as ReturnType<typeof createValidationClient>
  const onSave = vi.fn(async () => {}),
    onDisable = vi.fn(async () => {})
  container = document.createElement('div')
  document.body.append(container)
  const viewRoot = createRoot(container)
  root = viewRoot
  await act(async () => {
    viewRoot.render(
      <ValidationScheduleSettings
        client={client}
        task={value}
        pending={false}
        onSave={onSave}
        onDisable={onDisable}
        onBack={() => {}}
      />,
    )
  })
  return { client, read, onSave, onDisable }
}
const saveButton = () => button('dataValidation.schedule.save')

describe('real schedule form control boundaries', () => {
  it('submits the native schedule form without enabling an OFF rule', async () => {
    const f = await fixture({ ...task(), scheduleEnabled: false })
    await settled(() => expect(saveButton().disabled).toBe(false))
    const save = saveButton()
    expect(save.form).not.toBeNull()
    expect(save.type).toBe('submit')
    await act(async () => save.form!.requestSubmit(save))
    await settled(() => expect(f.onSave).toHaveBeenCalledTimes(1))
    expect(f.onSave).toHaveBeenCalledWith(schedule, false, 10)
    expect(f.onDisable).not.toHaveBeenCalled()
    await change('dataValidation.schedule.retention', '0')
    await act(async () =>
      save.form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
    )
    expect(f.onSave).toHaveBeenCalledTimes(1)
  })

  it('does not publish an older preview after the explicit zone changes', async () => {
    let resolveOld!: (value: ValidationPreview) => void,
      resolveNew!: (value: ValidationPreview) => void
    const old = new Promise<ValidationPreview>((resolve) => {
        resolveOld = resolve
      }),
      next = new Promise<ValidationPreview>((resolve) => {
        resolveNew = resolve
      })
    const read = vi
      .fn<
        (input: {
          schedule: ValidationSchedule
          inputRevision: string
        }) => Promise<ValidationPreview>
      >()
      .mockReturnValueOnce(old)
      .mockReturnValueOnce(next)
    await fixture(task(), read)
    await settled(() => expect(read).toHaveBeenCalledTimes(1))
    await change('dataValidation.schedule.zone', 'UTC')
    await settled(() => expect(read).toHaveBeenCalledTimes(2))
    await act(async () => resolveOld(preview(read.mock.calls[0][0], 'old')))
    expect(
      [...document.querySelectorAll('aside li strong')]
        .map((node) => node.getAttribute('title'))
        .join(' '),
    ).not.toContain('old-0')
    expect(saveButton().hasAttribute('disabled')).toBe(true)
    await act(async () => resolveNew(preview(read.mock.calls[1][0], 'new')))
    expect(
      [...document.querySelectorAll('aside li strong')]
        .map((node) => node.getAttribute('title'))
        .join(' '),
    ).toContain('new-0')
    expect(saveButton().hasAttribute('disabled')).toBe(false)
  })
  it('keeps OFF independent of an invalid draft and waits for a real saved state before showing OFF', async () => {
    const interval: ValidationSchedule = {
      kind: 'INTERVAL',
      every: '30',
      unit: 'MINUTES',
      anchor: '2026-10-28T00:00:00Z',
      expression: null,
      zoneId: 'Asia/Shanghai',
    }
    const f = await fixture(task(interval))
    await change('dataValidation.schedule.every', '0')
    await change('dataValidation.schedule.retention', '200')
    expect(saveButton().hasAttribute('disabled')).toBe(true)
    await click('dataValidation.schedule.disable')
    expect(f.onDisable).toHaveBeenCalledTimes(1)
    expect(f.onSave).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('dataValidation.schedule.on')
  })
  it('requires an explicit confirmation before shrinking retained FULL history', async () => {
    const f = await fixture()
    await settled(() => expect(saveButton().hasAttribute('disabled')).toBe(false))
    await change('dataValidation.schedule.retention', '3')
    saveButton().focus()
    await click('dataValidation.schedule.save')
    expect(document.querySelector('[role=alertdialog]')).toBeTruthy()
    expect(f.onSave).not.toHaveBeenCalled()
    await click('dataValidation.cancel')
    await settled(() => expect(document.querySelector('[role=alertdialog]')).toBeNull())
    expect(f.onSave).not.toHaveBeenCalled()
    await click('dataValidation.schedule.save')
    await click('dataValidation.confirm')
    expect(f.onSave).toHaveBeenCalledWith(schedule, true, 3)
  })
  it('changing only history preserves the original interval anchor and does not issue another preview', async () => {
    const interval: ValidationSchedule = {
      kind: 'INTERVAL',
      every: '30',
      unit: 'MINUTES',
      anchor: '2026-10-28T00:00:00Z',
      expression: null,
      zoneId: 'Asia/Shanghai',
    }
    const f = await fixture(task(interval))
    await settled(() => expect(saveButton().hasAttribute('disabled')).toBe(false))
    await change('dataValidation.schedule.retention', '11')
    await click('dataValidation.schedule.save')
    expect(f.onSave).toHaveBeenCalledWith(interval, true, 11)
    expect(f.read).toHaveBeenCalledTimes(1)
  })
  it('blocks duplicate submissions while the actual parent operation is pending', async () => {
    const f = await fixture()
    await settled(() => expect(saveButton().hasAttribute('disabled')).toBe(false))
    let finish!: () => void
    f.onSave.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        }),
    )
    await click('dataValidation.schedule.save')
    expect(saveButton().hasAttribute('disabled')).toBe(true)
    expect(button('dataValidation.schedule.disable').hasAttribute('disabled')).toBe(true)
    await click('dataValidation.schedule.save')
    expect(f.onSave).toHaveBeenCalledTimes(1)
    await act(async () => finish())
    expect(saveButton().hasAttribute('disabled')).toBe(false)
  })

  it('shows a failed OFF operation without fabricating a saved OFF state or retrying', async () => {
    const f = await fixture()
    f.onDisable.mockRejectedValueOnce(new Error('unknown-completion'))
    await click('dataValidation.schedule.disable')
    await settled(() => expect(document.querySelector('[role=alert]')).not.toBeNull())
    expect(document.body.textContent).toContain('dataValidation.schedule.on')
    expect(f.onDisable).toHaveBeenCalledTimes(1)
    expect(f.onSave).not.toHaveBeenCalled()
  })
})

it('retries a failed schedule preview without changing the draft or publishing it', async () => {
  const read = vi
    .fn(async (input: { schedule: ValidationSchedule; inputRevision: string }) => preview(input))
    .mockRejectedValueOnce(new Error('temporary read failure'))
  const view = await fixture(task(), read)
  await settled(() => expect(document.body.textContent).toContain('dataValidation.requestFailed'))
  expect(saveButton().disabled).toBe(true)
  await click('dataValidation.schedule.retryPreview')
  await settled(() => expect(read).toHaveBeenCalledTimes(2))
  await settled(() => expect(saveButton().disabled).toBe(false))
  expect(read.mock.calls[1][0].schedule).toEqual(read.mock.calls[0][0].schedule)
  expect(read.mock.calls[1][0].inputRevision).not.toBe(read.mock.calls[0][0].inputRevision)
  expect(view.onSave).not.toHaveBeenCalled()
})

it('discards only the local schedule draft and retains the saved enabled plan', async () => {
  const view = await fixture()
  await settled(() => expect(saveButton().disabled).toBe(false))
  await change('dataValidation.schedule.expression', '0 3 * * *')
  await change('dataValidation.schedule.retention', '9')
  expect(document.body.textContent).toContain('dataValidation.schedule.dirty')
  await click('dataValidation.schedule.discard')
  expect(field('dataValidation.schedule.expression').value).toBe('0 2 * * *')
  expect(field('dataValidation.schedule.retention').value).toBe('10')
  expect(document.body.textContent).toContain('dataValidation.schedule.unchanged')
  expect(view.onSave).not.toHaveBeenCalled()
  expect(view.onDisable).not.toHaveBeenCalled()
})

it('returns a never-saved schedule to a pristine empty draft after discard', async () => {
  const view = await fixture({ ...task(), schedule: null, scheduleEnabled: false })
  expect(button('dataValidation.schedule.discard').disabled).toBe(true)
  expect(document.body.textContent).toContain('dataValidation.schedule.pristine')
  await click('dataValidation.schedule.exampleInterval')
  expect(button('dataValidation.schedule.discard').disabled).toBe(false)
  await click('dataValidation.schedule.discard')
  expect(field('dataValidation.schedule.every').value).toBe('')
  expect(button('dataValidation.schedule.discard').disabled).toBe(true)
  expect(document.body.textContent).not.toContain('dataValidation.schedule.dirty')
  expect(view.onSave).not.toHaveBeenCalled()
})
