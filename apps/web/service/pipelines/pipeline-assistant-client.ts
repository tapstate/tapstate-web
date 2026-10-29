import type { ApiFetcher } from '../source-client'
import type { PipelineJsonObject } from './pipeline-client'

export interface AiProviderSettings {
  configured: boolean
  providerId: string
  baseUrl: string
  model: string
}
export interface AiProviderInput {
  providerId: string
  baseUrl: string
  model: string
  apiKey: string
}
export interface AssistantProposal {
  baseRevision: number
  candidateWizard: PipelineJsonObject
  validation: unknown
  diff: unknown
}
export interface AssistantValidation {
  valid: boolean
  candidateWizard: PipelineJsonObject
  validation: unknown
  diff: unknown
}
export class AssistantClientError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code)
  }
}
async function request<T>(path: string, apiFetch: ApiFetcher, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, init)
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new AssistantClientError(
      typeof error.code === 'string' ? error.code : 'request-failed',
      response.status,
    )
  }
  return response.status === 204 ? (undefined as T) : response.json()
}
export function getAiProviderSettings(apiFetch: ApiFetcher) {
  return request<AiProviderSettings>('/api/ai-provider-settings', apiFetch)
}
export function updateAiProviderSettings(input: AiProviderInput, apiFetch: ApiFetcher) {
  return request<AiProviderSettings>('/api/ai-provider-settings', apiFetch, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}
export function checkAiProviderSettings(input: AiProviderInput, apiFetch: ApiFetcher) {
  return request<unknown>('/api/ai-provider-settings:check', apiFetch, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}
export function deleteAiProviderSettings(apiFetch: ApiFetcher) {
  return request<void>('/api/ai-provider-settings', apiFetch, { method: 'DELETE' })
}
export function validateAssistantProposal(
  pipelineId: string,
  revision: number,
  candidateWizard: PipelineJsonObject,
  apiFetch: ApiFetcher,
) {
  return request<AssistantValidation>(
    `/api/pipelines/${encodeURIComponent(pipelineId)}/draft:assistant-validate`,
    apiFetch,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ revision, candidateWizard }),
    },
  )
}

export async function assistantStreamFetch(
  apiFetch: ApiFetcher,
  input: RequestInfo | URL,
  init?: RequestInit,
  onComplete?: (complete: boolean) => void,
) {
  const response = await apiFetch(input, init)
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null)
    const code =
      typeof payload === 'object' &&
      payload !== null &&
      'code' in payload &&
      typeof payload.code === 'string'
        ? payload.code
        : 'request-failed'
    throw new AssistantClientError(code, response.status)
  }
  if (!response.body || typeof TransformStream === 'undefined') {
    onComplete?.(false)
    return response
  }
  let buffer = ''
  let complete = false
  const decoder = new TextDecoder()
  const body = response.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true })
        let boundary: RegExpExecArray | null
        while ((boundary = /\r?\n\r?\n/.exec(buffer)) !== null) {
          const frame = buffer.slice(0, boundary.index)
          buffer = buffer.slice(boundary.index + boundary[0].length)
          const data = frame
            .split(/\r?\n/)
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice(5).trimStart())
            .join('\n')
          if (!data) continue
          try {
            const part: unknown = JSON.parse(data)
            if (
              typeof part === 'object' &&
              part !== null &&
              'type' in part &&
              part.type === 'finish'
            )
              complete = 'finishReason' in part && part.finishReason === 'stop'
          } catch {
            // The SDK remains responsible for reporting malformed stream chunks.
          }
        }
        controller.enqueue(chunk)
      },
      flush() {
        onComplete?.(complete)
      },
    }),
  )
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })
}
export function assistantErrorKind(
  code: string,
):
  | 'notConfigured'
  | 'providerAuth'
  | 'providerUnavailable'
  | 'schema'
  | 'domain'
  | 'stale'
  | 'overloaded'
  | 'requestFailed' {
  if (code.startsWith('dsl.')) return 'domain'
  switch (code) {
    case 'control.ai-not-configured':
      return 'notConfigured'
    case 'control.ai-provider-auth-failed':
      return 'providerAuth'
    case 'control.ai-provider-unavailable':
    case 'control.ai-provider-failed':
      return 'providerUnavailable'
    case 'control.ai-invalid-proposal':
    case 'control.ai-schema-invalid':
      return 'schema'
    case 'control.ai-domain-invalid':
    case 'pipeline-draft.invalid':
      return 'domain'
    case 'pipeline-draft.revision-conflict':
      return 'stale'
    case 'control.ai-overloaded':
      return 'overloaded'
    default:
      return 'requestFailed'
  }
}
