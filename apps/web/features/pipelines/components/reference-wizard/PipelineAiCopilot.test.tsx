import '@/i18n/index'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { readFileSync } from 'node:fs'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '@/stores/auth-store'

import { PipelineAiCopilot, type BuilderAssistantContext } from './PipelineAiCopilot'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root | undefined
let container: HTMLDivElement
const encoder = new TextEncoder()
const javaStreamFixturePath = process.env.TAPSTATE_ASSISTANT_JAVA_STREAM_FIXTURE
function stream(parts: unknown[]) {
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const part of parts)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(part)}\n\n`))
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    }),
    { headers: { 'Content-Type': 'text/event-stream', 'x-vercel-ai-ui-message-stream': 'v1' } },
  )
}
const candidate = {
  root: {
    source: 'pg',
    table: 'customers',
    keys: ['id'],
    primaryKey: 'id',
    rowCount: '',
    columns: [],
    transforms: [],
  },
  relations: [],
  transforms: [],
  destinationTable: 'customer_docs',
  destinationSourceId: 'mongo',
  destinationWriteMode: 'upsert',
}
const proposal = {
  baseRevision: 3,
  candidateWizard: candidate,
  validation: { valid: true },
  diff: [{ path: '/root/table', before: 'users', after: 'customers' }],
}
const context: BuilderAssistantContext = {
  pipelineId: 'customers',
  revision: 3,
  blocked: false,
  onApply: vi.fn(),
}
function render(value = context) {
  root?.render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <PipelineAiCopilot
        context={value}
        focus="root"
        focusLabel="Step 1 · customers"
        promptRequest={null}
        onClose={vi.fn()}
      />
    </QueryClientProvider>,
  )
}
async function mount(value = context) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () => render(value))
}
function button(text: string) {
  return [...container.querySelectorAll('button')].find(
    (node) => node.textContent?.includes(text) || node.getAttribute('aria-label')?.includes(text),
  )!
}
async function generate() {
  const suggestion = button('Infer parent')
  if (suggestion) {
    await act(async () => suggestion.click())
    return
  }
  const input = container.querySelector<HTMLTextAreaElement>(
    '[aria-label="Pipeline assistant prompt"]',
  )!
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(
      input,
      'Analyze available table metadata and infer parent relationships',
    )
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Send"]')!.click())
}
afterEach(async () => {
  await act(async () => root?.unmount())
  container?.remove()
  root = undefined
  vi.restoreAllMocks()
  vi.clearAllMocks()
})
function response(baseRevision = proposal.baseRevision) {
  return stream([
    { type: 'start', messageId: 'reply' },
    { type: 'text-start', id: 'text' },
    { type: 'text-delta', id: 'text', delta: 'Suggested relation' },
    { type: 'text-end', id: 'text' },
    { type: 'data-status', data: { state: 'validating' } },
    { type: 'data-proposal', data: { ...proposal, baseRevision } },
    { type: 'finish', finishReason: 'stop' },
  ])
}

describe('Pipeline Builder assistant', () => {
  it('keeps validation findings in the conversation so the user can clarify', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        stream([
          { type: 'start', messageId: 'clarify' },
          { type: 'text-start', id: 'text' },
          { type: 'text-delta', id: 'text', delta: 'Which source should I use?' },
          { type: 'text-end', id: 'text' },
          {
            type: 'data-status',
            data: {
              state: 'needs-input',
              diagnostics: [
                { code: 'pipeline-draft.invalid', params: { reason: 'Select a source' } },
              ],
            },
          },
          { type: 'finish', finishReason: 'stop' },
        ]),
      )
      .mockResolvedValueOnce(response())
    useAuthStore.setState({ apiFetch: fetch })
    await mount()
    await generate()
    await vi.waitFor(() => expect(container.textContent).toContain('Select a source'))
    expect(button('Validate and apply')).toBeUndefined()
    const input = container.querySelector<HTMLTextAreaElement>(
      '[aria-label="Pipeline assistant prompt"]',
    )!
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(
        input,
        'Use PostgreSQL',
      )
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () =>
      container.querySelector<HTMLButtonElement>('[aria-label="Send"]')!.click(),
    )
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
    const request = JSON.parse(String(fetch.mock.calls[1][1].body))
    expect(JSON.stringify(request.messages)).toContain('Select a source')
    expect(JSON.stringify(request.messages)).toContain('Use PostgreSQL')
  })

  it('shows proposal actions in chat and displays the DSL changes for review', async () => {
    const dslProposal = {
      ...proposal,
      diff: {
        before: 'source: users\n',
        after: 'source: customers\n',
        changes: [{ path: 'wizard.root.table', before: 'users', after: 'customers' }],
      },
    }
    useAuthStore.setState({
      apiFetch: vi.fn().mockResolvedValue(
        stream([
          { type: 'start', messageId: 'reply' },
          { type: 'text-start', id: 'text' },
          { type: 'text-delta', id: 'text', delta: 'Change the input table.' },
          { type: 'text-end', id: 'text' },
          { type: 'data-proposal', data: dslProposal },
          { type: 'finish', finishReason: 'stop' },
        ]),
      ),
    })
    await mount()
    await generate()
    await vi.waitFor(() => expect(button('Validate and apply')).toBeTruthy())
    expect(button('Reject')).toBeTruthy()
    await act(async () => button('Review proposed pipeline changes').click())
    expect(container.textContent).toContain('source: users')
    expect(container.textContent).toContain('source: customers')
    expect(container.textContent).toContain('wizard.root.table')
  })

  it('renders text deltas while the response remains open', async () => {
    let controller!: ReadableStreamDefaultController<Uint8Array>
    useAuthStore.setState({
      apiFetch: vi.fn().mockResolvedValue(
        new Response(
          new ReadableStream({
            start(value) {
              controller = value
            },
          }),
          {
            headers: { 'Content-Type': 'text/event-stream', 'x-vercel-ai-ui-message-stream': 'v1' },
          },
        ),
      ),
    })
    await mount()
    await generate()
    const emit = (part: unknown) =>
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(part)}\n\n`))
    await act(async () => {
      emit({ type: 'start', messageId: 'incremental' })
      emit({ type: 'text-start', id: 'text' })
      emit({ type: 'text-delta', id: 'text', delta: 'First streamed paragraph.' })
    })
    await vi.waitFor(() => expect(container.textContent).toContain('First streamed paragraph.'))
    expect(container.querySelector('[aria-label="Stop"]')).not.toBeNull()
    expect(container.textContent).not.toContain('Review proposed')
    await act(async () => {
      emit({ type: 'text-delta', id: 'text', delta: ' Another paragraph.' })
    })
    await vi.waitFor(() => expect(container.textContent).toContain('Another paragraph.'))
    await act(async () => {
      emit({ type: 'text-end', id: 'text' })
      emit({ type: 'finish', finishReason: 'stop' })
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    })
  })

  it('can stop while preparing the draft before a provider request starts', async () => {
    let finishSave!: (revision: number) => void
    const prepareRequest = () =>
      new Promise<number>((resolve) => {
        finishSave = resolve
      })
    const apiFetch = vi.fn()
    useAuthStore.setState({ apiFetch })
    await mount({ ...context, prepareRequest })
    await generate()
    const stop = container.querySelector<HTMLButtonElement>('[aria-label="Stop"]')
    expect(stop).not.toBeNull()
    await act(async () => stop!.click())
    await act(async () => finishSave(3))
    expect(apiFetch).not.toHaveBeenCalled()
    expect(container.querySelector('[aria-label="Stop"]')).toBeNull()
  })

  it.skipIf(!javaStreamFixturePath)(
    'consumes a Java-produced stream through the real AI SDK client',
    async () => {
      const javaBytes = readFileSync(javaStreamFixturePath!)
      const javaParts = javaBytes
        .toString('utf8')
        .split(/\r?\n/)
        .filter((line) => line.startsWith('data: ') && line !== 'data: [DONE]')
        .map((line) => JSON.parse(line.slice('data: '.length)))
      const javaProposalPart = javaParts.find((part) => part.type === 'data-proposal')
      expect(javaProposalPart).toBeDefined()
      const javaProposal = javaProposalPart.data
      const apiFetch = vi
        .fn()
        .mockResolvedValueOnce(
          new Response(new Uint8Array(javaBytes), {
            headers: {
              'Content-Type': 'text/event-stream',
              'x-vercel-ai-ui-message-stream': 'v1',
            },
          }),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              valid: true,
              candidateWizard: javaProposal.candidateWizard,
              validation: javaProposal.validation,
              diff: javaProposal.diff,
            }),
          ),
        )
      useAuthStore.setState({ apiFetch })
      await mount({ ...context, revision: javaProposal.baseRevision })
      await generate()

      expect(container.textContent).toContain('I used the selected schema.')
      expect(container.textContent).toContain('Review proposed')
      await act(async () => button('Review proposed').click())
      await act(async () => button('Validate and apply').click())

      expect(apiFetch.mock.calls[0][0]).toBe('/api/pipelines/customers/draft:assistant')
      expect(apiFetch.mock.calls[1][0]).toBe('/api/pipelines/customers/draft:assistant-validate')
      expect(context.onApply).toHaveBeenCalledExactlyOnceWith(javaProposal.candidateWizard)
    },
  )

  it('streams through the authenticated SDK transport and applies only after explicit validation', async () => {
    const apiFetch = vi
      .fn()
      .mockResolvedValueOnce(response())
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            valid: true,
            candidateWizard: candidate,
            validation: {},
            diff: proposal.diff,
          }),
        ),
      )
    useAuthStore.setState({ apiFetch })
    await mount()
    await generate()
    expect(context.onApply).not.toHaveBeenCalled()
    expect(container.textContent).toContain('Suggested relation')
    expect(JSON.parse(apiFetch.mock.calls[0][1].body)).toMatchObject({
      revision: 3,
      focus: { kind: 'root', nodeId: 'root' },
      messages: [{ role: 'user', text: expect.any(String) }],
    })
    await act(async () => button('Review proposed').click())
    await act(async () => button('Validate and apply').click())
    expect(apiFetch.mock.calls[1][0]).toBe('/api/pipelines/customers/draft:assistant-validate')
    expect(context.onApply).toHaveBeenCalledExactlyOnceWith(candidate)
    expect(button('Applied to editor').matches(':disabled, [aria-disabled="true"]')).toBe(true)
  })
  it('omits an empty assistant reply from the next request history', async () => {
    const apiFetch = vi
      .fn()
      .mockResolvedValueOnce(
        stream([
          { type: 'start', messageId: 'empty-reply' },
          { type: 'text-start', id: 'empty-text' },
          { type: 'text-end', id: 'empty-text' },
          { type: 'finish', finishReason: 'stop' },
        ]),
      )
      .mockResolvedValueOnce(response())
    useAuthStore.setState({ apiFetch })
    await mount()
    await generate()
    await generate()
    const secondBody = JSON.parse(apiFetch.mock.calls[1][1].body)
    expect(secondBody.messages).toHaveLength(2)
    expect(secondBody.messages.every((message: { text: string }) => message.text.trim())).toBe(true)
  })
  it('flushes editor autosave before generating and still blocks apply until the draft is current', async () => {
    const prepareRequest = vi.fn().mockResolvedValue(8)
    const apiFetch = vi.fn().mockResolvedValue(response(8))
    useAuthStore.setState({ apiFetch })
    const pendingDraftContext = Object.assign({}, context, {
      blocked: true,
      sendBlocked: false,
      prepareRequest,
    })
    await mount(pendingDraftContext)

    expect(button('Infer parent').disabled).toBe(false)
    await act(async () => button('Infer parent').click())
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalledOnce())

    expect(prepareRequest).toHaveBeenCalledOnce()
    expect(JSON.parse(apiFetch.mock.calls[0][1].body)).toMatchObject({ revision: 8 })
    await act(async () => render({ ...pendingDraftContext, revision: 8 }))
    await act(async () => button('Review proposed').click())
    expect(button('Validate and apply').disabled).toBe(true)
  })
  it('does not send against a stale draft when the save-before-send step fails', async () => {
    const prepareRequest = vi.fn().mockRejectedValue(new Error('save-conflict'))
    const apiFetch = vi.fn()
    useAuthStore.setState({ apiFetch })
    await mount(
      Object.assign({}, context, {
        blocked: true,
        sendBlocked: false,
        prepareRequest,
      }),
    )

    await act(async () => button('Infer parent').click())
    await vi.waitFor(() => expect(prepareRequest).toHaveBeenCalledOnce())

    expect(apiFetch).not.toHaveBeenCalled()
    expect(
      container.querySelector<HTMLTextAreaElement>('[aria-label="Pipeline assistant prompt"]')
        ?.value,
    ).toContain('Analyze available table metadata')
    expect(container.textContent).toContain('could not be saved')
  })
  it('unlocks after reset during autosave without letting the stale save unlock a newer request', async () => {
    let resolveFirst!: (revision: number) => void
    let resolveSecond!: (revision: number) => void
    const firstSave = new Promise<number>((resolve) => {
      resolveFirst = resolve
    })
    const secondSave = new Promise<number>((resolve) => {
      resolveSecond = resolve
    })
    const prepareRequest = vi
      .fn()
      .mockImplementationOnce(() => firstSave)
      .mockImplementationOnce(() => secondSave)
    const apiFetch = vi.fn().mockResolvedValue(response(8))
    useAuthStore.setState({ apiFetch })
    await mount(Object.assign({}, context, { blocked: false, sendBlocked: false, prepareRequest }))

    await generate()
    await vi.waitFor(() => expect(prepareRequest).toHaveBeenCalledOnce())
    await act(async () =>
      container.querySelector<HTMLButtonElement>('[aria-label="Clear conversation"]')?.click(),
    )
    expect(button('Infer parent').disabled).toBe(false)

    await generate()
    await vi.waitFor(() => expect(prepareRequest).toHaveBeenCalledTimes(2))
    expect(button('Infer parent').disabled).toBe(true)

    await act(async () => {
      resolveFirst(7)
      await firstSave
    })
    expect(button('Infer parent').disabled).toBe(true)

    await act(async () => {
      resolveSecond(8)
      await secondSave
    })
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalledOnce())
    expect(JSON.parse(apiFetch.mock.calls[0][1].body)).toMatchObject({ revision: 8 })
  })
  it('refuses proposals after a draft revision change', async () => {
    useAuthStore.setState({ apiFetch: vi.fn().mockResolvedValue(response()) })
    await mount()
    await generate()
    await act(async () => render({ ...context, revision: 4 }))
    await act(async () => button('Review proposed').click())
    expect(button('Validate and apply').disabled).toBe(true)
    expect(container.textContent).toContain('older draft')
    expect(context.onApply).not.toHaveBeenCalled()
  })
  it('keeps failed partial output informational and unavailable for Apply', async () => {
    useAuthStore.setState({
      apiFetch: vi.fn().mockResolvedValue(
        stream([
          { type: 'start', messageId: 'broken' },
          { type: 'text-start', id: 'text' },
          { type: 'text-delta', id: 'text', delta: 'Partial proposal' },
          { type: 'error', errorText: 'Provider unavailable' },
        ]),
      ),
    })
    await mount()
    await generate()
    expect(container.textContent).toContain('Partial proposal')
    expect(container.textContent).toContain('request failed')
    expect(context.onApply).not.toHaveBeenCalled()
    expect(button('Review proposed')).toBeUndefined()
  })
  it('does not expose a proposal when the stream closes without a successful finish part', async () => {
    const incomplete = response()
    const text = await incomplete.text()
    useAuthStore.setState({
      apiFetch: vi.fn().mockResolvedValue(
        new Response(
          text.replace(`data: ${JSON.stringify({ type: 'finish', finishReason: 'stop' })}\n\n`, ''),
          {
            headers: { 'Content-Type': 'text/event-stream', 'x-vercel-ai-ui-message-stream': 'v1' },
          },
        ),
      ),
    })
    await mount()
    await generate()
    expect(container.textContent).toContain('Suggested relation')
    expect(button('Review proposed')).toBeUndefined()
    expect(context.onApply).not.toHaveBeenCalled()
  })
  it('requires a second review when the server canonicalizes an edited proposal', async () => {
    const normalized = { ...candidate, transforms: [{ id: 'normalize' }] }
    useAuthStore.setState({
      apiFetch: vi
        .fn()
        .mockResolvedValueOnce(response())
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ valid: true, candidateWizard: normalized, diff: [] })),
        ),
    })
    await mount()
    await generate()
    await act(async () => button('Review proposed').click())
    await act(async () => button('Validate and apply').click())
    expect(context.onApply).not.toHaveBeenCalled()
    expect(container.textContent).toContain('server normalized')
    expect(
      container.querySelector<HTMLTextAreaElement>(
        'textarea[aria-label="Edit proposed configuration (JSON)"]',
      )?.value,
    ).toContain('normalize')
  })
  it('rejects without touching the editor', async () => {
    useAuthStore.setState({ apiFetch: vi.fn().mockResolvedValue(response()) })
    await mount()
    await generate()
    await act(async () => button('Review proposed').click())
    await act(async () => button('Reject').click())
    expect(context.onApply).not.toHaveBeenCalled()
    expect(button('Review proposed')).toBeUndefined()
  })
  it('maps a structured provider authentication failure to a recovery action', async () => {
    useAuthStore.setState({
      apiFetch: vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: 'control.ai-provider-auth-failed' }), {
          status: 401,
        }),
      ),
    })
    await mount()
    await generate()
    expect(container.textContent).toContain('rejected the credentials')
    expect(context.onApply).not.toHaveBeenCalled()
  })
  it('shows typed validation findings and omits unsafe diagnostic values', async () => {
    useAuthStore.setState({
      apiFetch: vi.fn().mockResolvedValue(
        stream([
          { type: 'start', messageId: 'invalid-proposal' },
          { type: 'text-start', id: 'text' },
          { type: 'text-delta', id: 'text', delta: 'Checking proposal' },
          { type: 'text-end', id: 'text' },
          {
            type: 'data-status',
            data: {
              state: 'error',
              status: 'error',
              code: 'dsl.illegal-expression',
              diagnostics: [
                {
                  code: 'dsl.illegal-expression',
                  params: { path: 'transforms[0].expr', detail: 'private expression text' },
                },
              ],
            },
          },
          { type: 'error', errorText: 'dsl.illegal-expression' },
          { type: 'finish', finishReason: 'error' },
        ]),
      ),
    })
    await mount()
    await generate()

    expect(container.textContent).toContain('dsl.illegal-expression')
    expect(container.textContent).toContain('transforms[0].expr')
    expect(container.textContent).not.toContain('private expression text')
    expect(context.onApply).not.toHaveBeenCalled()
  })
  it('shows typed domain diagnostics when the edited candidate fails server validation', async () => {
    const apiFetch = vi
      .fn()
      .mockResolvedValueOnce(response())
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            valid: false,
            validation: {
              valid: false,
              diagnostics: [
                {
                  code: 'dsl.illegal-expression',
                  params: { path: 'transforms[0].expr', detail: 'private expression text' },
                },
              ],
            },
            diff: { changes: [] },
          }),
        ),
      )
    useAuthStore.setState({ apiFetch })
    await mount()
    await generate()
    await act(async () => button('Review proposed').click())
    await act(async () => button('Validate and apply').click())

    expect(container.textContent).toContain('dsl.illegal-expression')
    expect(container.textContent).toContain('transforms[0].expr')
    expect(container.textContent).not.toContain('private expression text')
    expect(context.onApply).not.toHaveBeenCalled()
  })
  it('requires review of a newly computed diff after the candidate is edited', async () => {
    const edited = { ...candidate, destinationTable: 'edited_docs' }
    const apiFetch = vi
      .fn()
      .mockResolvedValueOnce(response())
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            valid: true,
            candidateWizard: edited,
            diff: { changes: [{ path: 'destinationTable', after: 'edited_docs' }] },
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            valid: true,
            candidateWizard: edited,
            diff: { changes: [{ path: 'destinationTable', after: 'edited_docs' }] },
          }),
        ),
      )
    useAuthStore.setState({ apiFetch })
    await mount()
    await generate()
    await act(async () => button('Review proposed').click())
    const input = container.querySelector<HTMLTextAreaElement>(
      'textarea[aria-label="Edit proposed configuration (JSON)"]',
    )!
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(
        input,
        JSON.stringify(edited),
      )
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => button('Validate and apply').click())
    expect(context.onApply).not.toHaveBeenCalled()
    expect(container.textContent).toContain('edited proposal was validated')
    await act(async () => button('Validate and apply').click())
    expect(context.onApply).toHaveBeenCalledExactlyOnceWith(edited)
  })
  it('shows streaming progress and cancellation without making partial text applicable', async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            'data: {"type":"start","messageId":"slow"}\n\ndata: {"type":"text-start","id":"t"}\n\ndata: {"type":"text-delta","id":"t","delta":"Working"}\n\ndata: {"type":"data-status","data":{"state":"validating"}}\n\n',
          ),
        )
      },
    })
    useAuthStore.setState({
      apiFetch: vi.fn().mockResolvedValue(
        new Response(body, {
          headers: { 'Content-Type': 'text/event-stream', 'x-vercel-ai-ui-message-stream': 'v1' },
        }),
      ),
    })
    await mount()
    await generate()
    expect(container.textContent).toContain('Validating the proposed pipeline')
    await act(async () => button('Stop').click())
    expect(container.textContent).toContain('Generation stopped')
    expect(context.onApply).not.toHaveBeenCalled()
  })
  it('does not render an empty assistant bubble before the first reply token', async () => {
    let controller!: ReadableStreamDefaultController<Uint8Array>
    const body = new ReadableStream<Uint8Array>({
      start(streamController) {
        controller = streamController
        controller.enqueue(
          encoder.encode(
            'data: {"type":"start","messageId":"waiting"}\n\ndata: {"type":"text-start","id":"reply"}\n\n',
          ),
        )
      },
    })
    useAuthStore.setState({
      apiFetch: vi.fn().mockResolvedValue(
        new Response(body, {
          headers: { 'Content-Type': 'text/event-stream', 'x-vercel-ai-ui-message-stream': 'v1' },
        }),
      ),
    })
    await mount()
    await generate()

    await vi.waitFor(() =>
      expect(container.textContent).toContain('Connecting to your AI provider…'),
    )
    expect(container.querySelector('.pipeline-ai-message')).toBeNull()

    await act(async () => {
      controller.enqueue(
        encoder.encode('data: {"type":"text-delta","id":"reply","delta":"Hello"}\n\n'),
      )
    })
    await vi.waitFor(() =>
      expect(container.querySelector('.pipeline-ai-message')?.textContent).toBe('Hello'),
    )

    await act(async () => {
      controller.enqueue(
        encoder.encode(
          'data: {"type":"text-end","id":"reply"}\n\ndata: {"type":"finish","finishReason":"stop"}\n\ndata: [DONE]\n\n',
        ),
      )
      controller.close()
    })
  })
})
