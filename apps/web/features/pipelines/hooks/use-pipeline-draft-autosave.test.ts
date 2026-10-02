import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PipelineDraft, PipelineDraftMutation } from '@/service/pipelines/pipeline-client'

const { createDraft, updateDraft } = vi.hoisted(() => ({
  createDraft: vi.fn(),
  updateDraft: vi.fn(),
}))

vi.mock('@/service/pipelines/pipeline-client', () => ({
  createPipelineDraft: createDraft,
  updatePipelineDraft: updateDraft,
}))

import { usePipelineDraftAutosave } from './use-pipeline-draft-autosave'

const draftResponse = {
  draft: { revision: 1 } as PipelineDraft,
  etag: '"1"',
}

function Harness({
  mutation,
  onReady,
}: {
  mutation: PipelineDraftMutation | null
  onReady?: (flush: () => void) => void
}): ReactNode {
  const autosave = usePipelineDraftAutosave({
    enabled: true,
    mutation,
    initialEtag: null,
    fetcher: vi.fn(),
  })
  onReady?.(autosave.flushOnPageClose)
  return null
}

describe('usePipelineDraftAutosave', () => {
  let root: Root
  let host: HTMLDivElement

  beforeEach(() => {
    vi.useFakeTimers()
    createDraft.mockResolvedValue(draftResponse)
    updateDraft.mockResolvedValue(draftResponse)
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
  })

  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('waits five seconds after the latest graph change and does not poll after saving', async () => {
    const firstMutation = { pipelineId: 'orders', mode: 'dag' } as PipelineDraftMutation
    const secondMutation = { ...firstMutation, description: 'changed' }

    await act(async () => root.render(createElement(Harness, { mutation: null })))
    await act(async () => root.render(createElement(Harness, { mutation: firstMutation })))
    await act(async () => vi.advanceTimersByTime(4999))
    expect(createDraft).not.toHaveBeenCalled()

    await act(async () => vi.advanceTimersByTime(1))
    expect(createDraft).toHaveBeenCalledTimes(1)

    await act(async () => root.render(createElement(Harness, { mutation: secondMutation })))
    await act(async () => vi.advanceTimersByTime(4999))
    expect(updateDraft).not.toHaveBeenCalled()
    await act(async () => vi.advanceTimersByTime(1))
    expect(updateDraft).toHaveBeenCalledTimes(1)

    await act(async () => vi.advanceTimersByTime(15000))
    expect(createDraft).toHaveBeenCalledTimes(1)
    expect(updateDraft).toHaveBeenCalledTimes(1)
  })

  it('flushes a pending graph with keepalive when the page is closing', async () => {
    const mutation = { pipelineId: 'orders', mode: 'dag' } as PipelineDraftMutation
    let flushOnPageClose: (() => void) | undefined

    await act(async () => root.render(createElement(Harness, { mutation: null })))
    await act(async () => root.render(createElement(Harness, { mutation })))
    await act(async () => vi.advanceTimersByTime(5000))
    expect(createDraft).toHaveBeenCalledTimes(1)

    await act(async () =>
      root.render(
        createElement(Harness, {
          mutation: { ...mutation, name: 'updated' },
          onReady: (flush) => {
            flushOnPageClose = flush
          },
        }),
      ),
    )
    // The close flush must not wait for the debounce window.
    await act(async () => flushOnPageClose?.())
    expect(updateDraft).toHaveBeenCalledWith(
      'orders',
      expect.objectContaining({ name: 'updated' }),
      '"1"',
      expect.any(Function),
      { keepalive: true },
    )
  })
})
