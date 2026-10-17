import '@/i18n/index'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '@/stores/auth-store'

import { AssistantProviderForm } from './AssistantProviderForm'
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root | undefined
let container: HTMLDivElement
const settings = {
  configured: true,
  providerId: 'openai-compatible',
  baseUrl: 'https://api.example.com/v1',
  model: 'example-model',
}
async function mount(apiFetch: typeof fetch) {
  useAuthStore.setState({ apiFetch })
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () =>
    root?.render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <AssistantProviderForm onBack={vi.fn()} />
      </QueryClientProvider>,
    ),
  )
}
async function inputKey(value: string) {
  const input = container.querySelector<HTMLInputElement>('input[type="password"]')!
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
function button(text: string) {
  return [...container.querySelectorAll('button')].find((b) => b.textContent?.includes(text))!
}
afterEach(async () => {
  await act(async () => root?.unmount())
  container?.remove()
  root = undefined
  vi.restoreAllMocks()
})
describe('Builder assistant provider configuration', () => {
  it('keeps rotation keys transient and clears them after a successful check', async () => {
    const apiFetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(settings)))
      .mockResolvedValueOnce(new Response('{}'))
    await mount(apiFetch)
    await inputKey('transient-key')
    await act(async () => button('Check connection').click())
    expect(JSON.parse(apiFetch.mock.calls[1][1].body)).toEqual({
      providerId: 'openai-compatible',
      baseUrl: settings.baseUrl,
      model: settings.model,
      apiKey: 'transient-key',
    })
    expect(container.querySelector<HTMLInputElement>('input[type="password"]')?.value).toBe('')
    expect(container.textContent).not.toContain('transient-key')
  })
  it('clears keys after failed checks and reports a recoverable failure', async () => {
    const apiFetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(settings)))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 'control.ai-provider-auth-failed' }), { status: 401 }),
      )
    await mount(apiFetch)
    await inputKey('bad-key')
    await act(async () => button('Check connection').click())
    expect(container.querySelector<HTMLInputElement>('input[type="password"]')?.value).toBe('')
    expect(container.textContent).toContain('rejected the credentials')
  })
  it('requires a key for a connection check even with saved metadata', async () => {
    const apiFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(settings)))
    await mount(apiFetch)
    expect(button('Check connection').disabled).toBe(true)
    expect(container.querySelector<HTMLInputElement>('input[type="password"]')?.required).toBe(true)
  })
  it('replaces saved credentials and clears the key after saving', async () => {
    const apiFetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(settings)))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValue(new Response(JSON.stringify(settings)))
    await mount(apiFetch)
    await inputKey('rotated-key')
    await act(async () =>
      container
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
    )
    const put = apiFetch.mock.calls.find((call) => call[1]?.method === 'PUT')!
    expect(JSON.parse(put[1].body)).toMatchObject({
      providerId: 'openai-compatible',
      apiKey: 'rotated-key',
    })
    expect(container.querySelector<HTMLInputElement>('input[type="password"]')?.value).toBe('')
  })
  it('shows the official OpenAI default and uses it when the optional base URL is blank', async () => {
    const apiFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ configured: false, baseUrl: null, model: null })),
      )
      .mockResolvedValueOnce(new Response('{}'))
    await mount(apiFetch)
    const url = container.querySelector<HTMLInputElement>('input[type="url"]')!
    expect(url.value).toBe('https://api.openai.com/v1')
    expect(url.required).toBe(false)
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(url, '')
      url.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await inputKey('common-api-key')
    await act(async () => button('Check connection').click())
    expect(JSON.parse(apiFetch.mock.calls[1][1].body).baseUrl).toBe('https://api.openai.com/v1')
  })
})
