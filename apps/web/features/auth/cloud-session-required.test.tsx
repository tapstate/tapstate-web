import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { i18n } from '@/i18n/index'

import { CloudSessionRequired } from './cloud-session-required'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let root: Root | undefined
let host: HTMLDivElement | undefined

beforeEach(async () => {
  await i18n.changeLanguage('en')
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root?.unmount())
  host?.remove()
  root = undefined
  host = undefined
})

describe('CloudSessionRequired', () => {
  it('shows a Cloud re-entry message without an on-prem password form', async () => {
    await act(async () => root?.render(<CloudSessionRequired />))

    expect(host?.textContent).toContain('Cluster session required')
    expect(host?.querySelector('input[type="password"]')).toBeNull()
    expect(host?.querySelector('form')).toBeNull()
  })
})
