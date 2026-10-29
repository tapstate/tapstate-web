import '@/i18n/index'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'

vi.mock('@/utils/deployment-profile', () => ({
  deploymentProfile: 'cloud',
  getDeploymentProfile: () => 'cloud',
}))

import { openTawkSupport, TawkFeedbackWidget } from '@/features/feedback/tawk-feedback-widget'

import { ReferenceWizardBuilder } from './ReferenceWizardBuilder'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

it('temporarily hides the Copilot while support is open and preserves its draft', async () => {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  window.Tawk_API = { showWidget: vi.fn(), hideWidget: vi.fn(), maximize: vi.fn() }
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={new QueryClient()}>
          <ReferenceWizardBuilder
            catalog={[]}
            initial={{
              root: null,
              relations: [],
              transforms: [],
              destinationTable: '',
              destinationSourceId: '',
              destinationWriteMode: 'upsert',
            }}
            onChange={vi.fn()}
            destinationName="MongoDB"
            deploymentProfile="cloud"
            footer={null}
            compiledSpec=""
            livePreview={null}
            livePreviewStatus="idle"
            livePreviewError=""
            assistant={{ pipelineId: 'orders', revision: 1, blocked: false, onApply: vi.fn() }}
          />
          <TawkFeedbackWidget />
        </QueryClientProvider>,
      ),
    )
    const sidebar = host.querySelector<HTMLElement>('.wizard-reference-sidebar')!
    const input = host.querySelector<HTMLTextAreaElement>('.pipeline-ai-composer-input')!
    expect(sidebar.classList.contains('hidden')).toBe(false)
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(
        input,
        'draft question',
      )
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => openTawkSupport())
    expect(sidebar.classList.contains('hidden')).toBe(true)
    await act(async () => window.Tawk_API?.onChatMinimized?.())
    expect(sidebar.classList.contains('hidden')).toBe(false)
    expect(input.value).toBe('draft question')
    await act(async () => openTawkSupport())
    expect(sidebar.classList.contains('hidden')).toBe(true)
    window.Tawk_API!.isChatHidden = () => false
    await act(async () => window.Tawk_API?.onChatHidden?.())
    expect(sidebar.classList.contains('hidden')).toBe(true)
    window.Tawk_API!.isChatHidden = () => true
    await act(async () => window.Tawk_API?.onChatHidden?.())
    expect(sidebar.classList.contains('hidden')).toBe(false)
    expect(input.value).toBe('draft question')
  } finally {
    await act(async () => root.unmount())
    host.remove()
    document.getElementById('tapstate-tawk-feedback-widget')?.remove()
    delete window.Tawk_API
  }
})
