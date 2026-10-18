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
  return [...container.querySelectorAll('button')].find((node) => node.textContent?.includes(text))!
}
async function generate() {
  await act(async () => button('Infer parent').click())
}
afterEach(async () => {
  await act(async () => root?.unmount())
  container?.remove()
  root = undefined
  vi.restoreAllMocks()
  vi.clearAllMocks()
})
function response() {
  return stream([
    { type: 'start', messageId: 'reply' },
    { type: 'text-start', id: 'text' },
    { type: 'text-delta', id: 'text', delta: 'Suggested relation' },
    { type: 'text-end', id: 'text' },
    { type: 'data-status', data: { state: 'validating' } },
    { type: 'data-proposal', data: proposal },
    { type: 'finish', finishReason: 'stop' },
  ])
}

describe('Pipeline Builder assistant', () => {
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
    expect(button('Applied to editor').disabled).toBe(true)
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
  it('blocks generation while an editor change is waiting for autosave', async () => {
    const apiFetch = vi.fn()
    useAuthStore.setState({ apiFetch })
    await mount({ ...context, blocked: true })
    expect(button('Infer parent').disabled).toBe(true)
    expect(container.textContent).toContain('finish saving')
    expect(apiFetch).not.toHaveBeenCalled()
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
})
