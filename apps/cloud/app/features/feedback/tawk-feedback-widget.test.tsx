import { StrictMode, act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import { cloudApi } from '../../service/cloud-api'
import { openTawkSupport, TawkFeedbackWidget } from './tawk-feedback-widget'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let host: HTMLDivElement
let root: Root
let showWidget: Mock<() => void>
let hideWidget: Mock<() => void>

describe('TawkFeedbackWidget', () => {
  beforeEach(() => {
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    showWidget = vi.fn<() => void>()
    hideWidget = vi.fn<() => void>()
    window.Tawk_API = { showWidget, hideWidget }
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    document.getElementById('tapstate-tawk-feedback-widget')?.remove()
    delete window.Tawk_API
    host.remove()
  })

  it('injects one vendor script under StrictMode and hides the widget on unmount', async () => {
    await act(async () => {
      root.render(
        <StrictMode>
          <TawkFeedbackWidget />
        </StrictMode>,
      )
    })

    expect(document.querySelectorAll('#tapstate-tawk-feedback-widget')).toHaveLength(1)
    expect(
      (document.getElementById('tapstate-tawk-feedback-widget') as HTMLScriptElement).src,
    ).toMatch(/^https:\/\/embed\.tawk\.to\//)

    await act(async () => root.unmount())
    expect(hideWidget).toHaveBeenCalled()
    root = createRoot(host)
  })

  it('keeps the support launcher hidden before the user asks for help', async () => {
    await act(async () => root.render(<TawkFeedbackWidget />))
    await act(async () => window.Tawk_API?.onLoad?.())

    expect(hideWidget).toHaveBeenCalled()
    expect(showWidget).not.toHaveBeenCalled()
  })

  it('hides the launcher again when the support chat is minimized', async () => {
    await act(async () => root.render(<TawkFeedbackWidget />))
    const api = window.Tawk_API as typeof window.Tawk_API & { onChatMinimized?: () => void }
    await act(async () => api?.onChatMinimized?.())

    expect(hideWidget).toHaveBeenCalled()
  })

  it('opens the hosted support page when the widget script is unavailable', async () => {
    await act(async () => root.render(<TawkFeedbackWidget />))
    const open = vi.spyOn(window, 'open').mockReturnValue(null)

    openTawkSupport()

    expect(open).toHaveBeenCalledWith(
      'https://tawk.to/chat/6ad811f9c0b97c34b365a428/1k5e0ceht',
      '_blank',
      'noopener,noreferrer',
    )
    open.mockRestore()
  })

  it('queues an offline notice without forwarding the visitor form data', async () => {
    const notify = vi.spyOn(cloudApi, 'notifyTawkOfflineSubmission').mockResolvedValue({
      queued: true,
    })

    await act(async () => {
      root.render(<TawkFeedbackWidget />)
    })
    await act(async () => {
      window.Tawk_API?.onOfflineSubmit?.({
        name: 'Private name',
        email: 'private@example.com',
        message: 'Private feedback',
      })
    })

    expect(notify).toHaveBeenCalledWith(
      expect.stringMatching(/^[0-9a-f-]{36}$/),
      '6ad811f9c0b97c34b365a428',
    )
    expect(notify.mock.calls[0]).toHaveLength(2)
  })
})
