import { StrictMode, act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import * as tawkFeedbackClient from '../../service/tawk-feedback-client'
import { TawkFeedbackWidget } from './tawk-feedback-widget'

vi.mock('@/utils/deployment-profile', () => ({ deploymentProfile: 'cloud' }))

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let host: HTMLDivElement
let root: Root
let existingOfflineSubmit: Mock<(data: unknown) => void>

describe('TawkFeedbackWidget', () => {
  beforeEach(() => {
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    existingOfflineSubmit = vi.fn<(data: unknown) => void>()
    window.Tawk_API = {
      showWidget: vi.fn(),
      hideWidget: vi.fn(),
      onOfflineSubmit: existingOfflineSubmit,
    }
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    document.getElementById('tapstate-tawk-feedback-widget')?.remove()
    delete window.Tawk_API
    host.remove()
    vi.restoreAllMocks()
  })

  it('injects one Tawk script under StrictMode', async () => {
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
    ).toBe('https://embed.tawk.to/6ad811f9c0b97c34b365a428/1k5e0ceht')
  })

  it('sends only a random event ID and Property ID after an offline form callback', async () => {
    const notify = vi
      .spyOn(tawkFeedbackClient, 'notifyTawkOfflineSubmission')
      .mockResolvedValue(undefined)

    await act(async () => {
      root.render(<TawkFeedbackWidget />)
    })
    await act(async () => {
      window.Tawk_API?.onOfflineSubmit?.({
        name: 'Private name',
        email: 'private@example.com',
        message: 'Private feedback',
      })
      await Promise.resolve()
    })

    expect(existingOfflineSubmit).toHaveBeenCalledWith({
      name: 'Private name',
      email: 'private@example.com',
      message: 'Private feedback',
    })
    expect(notify).toHaveBeenCalledWith(
      expect.stringMatching(/^[0-9a-f-]{36}$/),
      '6ad811f9c0b97c34b365a428',
    )
    expect(notify.mock.calls[0]).toHaveLength(2)
  })
})
