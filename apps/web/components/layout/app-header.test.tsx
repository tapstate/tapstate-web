import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { i18n } from '@/i18n'

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }))
import { AppHeader } from './app-header'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let host: HTMLDivElement
let root: Root
beforeEach(async () => {
  await i18n.changeLanguage('en')
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  await i18n.changeLanguage('en')
})
it('changes the visible application language through the actual menu item', async () => {
  await act(async () => root.render(<AppHeader />))
  await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Language"]')!.click())
  const chinese = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
    (item) => item.textContent === 'Simplified Chinese',
  )
  expect(chinese).toBeTruthy()
  await act(async () => chinese!.click())
  expect(i18n.language).toBe('zh-CN')
  expect(host.querySelector('[aria-label="语言"]')).toBeTruthy()
})
