import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  getAiProviderSettings,
  updateAiProviderSettings,
  checkAiProviderSettings,
  deleteAiProviderSettings,
  AssistantClientError,
  assistantErrorKind,
} from '@/service/pipelines/pipeline-assistant-client'
import { useAuthStore } from '@/stores/auth-store'

const DEFAULT_PROVIDER_BASE_URL = 'https://api.openai.com/v1'

export function AssistantProviderForm({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation()
  const apiFetch = useAuthStore((s) => s.apiFetch)
  const client = useQueryClient()
  const query = useQuery({
    queryKey: ['pipeline-assistant', 'provider'],
    queryFn: () => getAiProviderSettings(apiFetch),
    retry: false,
  })
  const [baseUrl, setBaseUrl] = useState<string | null>(null)
  const [model, setModel] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [feedback, setFeedback] = useState('')
  const mutation = useMutation({
    mutationFn: async (action: 'save' | 'check' | 'delete') => {
      setFeedback('')
      const input = {
        providerId: 'openai-compatible',
        baseUrl: (baseUrl ?? query.data?.baseUrl)?.trim() || DEFAULT_PROVIDER_BASE_URL,
        model: model?.trim() ?? query.data?.model ?? '',
        apiKey,
      }
      if (action === 'delete') return deleteAiProviderSettings(apiFetch)
      if (action === 'check') return checkAiProviderSettings(input, apiFetch)
      return updateAiProviderSettings(input, apiFetch)
    },
    onSuccess: (_data, action) => {
      setFeedback(t(`wizard.assistant.provider.${action}Success`))
      if (action !== 'check') {
        setApiKey('')
        void client.invalidateQueries({ queryKey: ['pipeline-assistant', 'provider'] })
      }
    },
    onError: (error) =>
      setFeedback(
        error instanceof AssistantClientError
          ? t(`wizard.assistant.errors.${assistantErrorKind(error.code)}`)
          : t('wizard.assistant.provider.failed'),
      ),
    onSettled: () => setApiKey(''),
  })
  const disabled = mutation.isPending || query.isPending
  return (
    <div className="pipeline-ai-settings flex-1 overflow-y-auto p-4 text-[12px]">
      <button type="button" className="mb-4 text-blue-700 hover:underline" onClick={onBack}>
        {t('wizard.assistant.back')}
      </button>
      <h3 className="mb-2 text-[13px] font-semibold">{t('wizard.assistant.provider.title')}</h3>
      <p className="mb-4 leading-relaxed text-gray-500">
        {t('wizard.assistant.provider.description')}
      </p>
      {query.isPending ? (
        <Loader2 className="animate-spin" aria-label={t('wizard.assistant.loading')} />
      ) : query.isError ? (
        <p role="alert">{t('wizard.assistant.provider.loadFailed')}</p>
      ) : null}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          mutation.mutate('save')
        }}
        className="space-y-3"
      >
        <label className="block">
          {t('wizard.assistant.provider.endpoint')}
          <input
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-200 focus:outline-none"
            type="url"
            value={baseUrl ?? query.data?.baseUrl ?? DEFAULT_PROVIDER_BASE_URL}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder={DEFAULT_PROVIDER_BASE_URL}
            disabled={disabled}
          />
        </label>
        <label className="block">
          {t('wizard.assistant.provider.model')}
          <input
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-200 focus:outline-none"
            required
            value={model ?? query.data?.model ?? ''}
            onChange={(e) => setModel(e.target.value)}
            disabled={disabled}
          />
        </label>
        <label className="block">
          {t('wizard.assistant.provider.key')}
          <input
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-200 focus:outline-none"
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            required
            placeholder={query.data?.configured ? t('wizard.assistant.provider.rotate') : ''}
            disabled={disabled}
          />
        </label>
        <p className="text-[11px] leading-relaxed text-gray-500">
          {t('wizard.assistant.provider.secretHint')}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-lg bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            disabled={disabled || !apiKey}
            type="submit"
          >
            {t('wizard.assistant.provider.save')}
          </button>
          <button
            className="rounded-lg border border-gray-200 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
            disabled={disabled || !apiKey}
            type="button"
            onClick={() => mutation.mutate('check')}
          >
            {t('wizard.assistant.provider.check')}
          </button>
          {query.data?.configured && (
            <button
              className="rounded-lg px-3 py-1.5 text-red-700 hover:bg-red-50 disabled:opacity-50"
              disabled={disabled}
              type="button"
              onClick={() => mutation.mutate('delete')}
            >
              {t('wizard.assistant.provider.delete')}
            </button>
          )}
        </div>
        {mutation.isPending && (
          <Loader2 className="h-4 w-4 animate-spin" aria-label={t('wizard.assistant.loading')} />
        )}
        {feedback && (
          <p role={mutation.isError ? 'alert' : 'status'} className="leading-relaxed">
            {feedback}
          </p>
        )}
      </form>
    </div>
  )
}
