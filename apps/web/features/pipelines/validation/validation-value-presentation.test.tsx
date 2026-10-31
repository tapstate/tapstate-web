import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'

import type { ValidationValue } from '@/service/pipelines/validation-client'

import { ValidationValueView } from './validation-value-view'
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: ReturnType<typeof createRoot>, host: HTMLDivElement
async function mount(value: ValidationValue) {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root.render(<ValidationValueView value={value} />))
}
afterEach(async () => {
  await act(async () => root?.unmount())
  host?.remove()
})
it('shows exact typed scalars immediately while technical metadata stays folded', async () => {
  await mount({
    type: 'typed',
    metadata: {
      logicalType: 'exact-number',
      nativeType: 'bigint',
      codecBinding: 'retained-binding',
    },
    value: { type: 'int64', metadata: {}, value: '9007199254740993' },
  })
  expect(host.querySelector('pre')?.textContent).toBe('9007199254740993')
  expect([...host.querySelectorAll('details')].every((n) => !n.open)).toBe(true)
  expect(host.textContent).not.toContain('retained-binding')
  const details = host.querySelector('details')!
  await act(async () => {
    details.open = true
    details.dispatchEvent(new Event('toggle'))
  })
  expect(host.textContent).toContain('retained-binding')
  expect(host.textContent).toContain('bigint')
})
it('keeps typed decimal scale and text null distinct from null', async () => {
  await mount({
    type: 'typed',
    metadata: { logicalType: 'exact-number' },
    value: { type: 'decimal', metadata: { scale: '4' }, value: '1234500' },
  })
  expect(host.querySelector('pre')?.textContent).toBe('123.4500')
  await act(async () =>
    root.render(<ValidationValueView value={{ type: 'text', metadata: {}, value: 'null' }} />),
  )
  expect(host.querySelector('pre')?.textContent).toBe('"null"')
  await act(async () =>
    root.render(<ValidationValueView value={{ type: 'null', metadata: {}, value: null }} />),
  )
  expect(host.querySelector('pre')?.textContent).toBe('null')
})
