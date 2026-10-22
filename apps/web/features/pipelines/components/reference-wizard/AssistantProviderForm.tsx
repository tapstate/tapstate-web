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
    <div className="pipeline-ai-settings min-h-0 flex-1 overflow-y-auto bg-white px-4 py-4 text-[12px] text-gray-800">
      <button
        type="button"
        className="mb-3 text-[11px] font-medium text-blue-700 hover:underline"
        onClick={onBack}
      >
        {t('wizard.assistant.back')}
      </button>
      <div className="mb-5 border-b border-gray-200 pb-4">
        <h3 className="text-[14px] font-semibold text-gray-900">
          {t('wizard.assistant.provider.title')}
        </h3>
        <p className="mt-1.5 text-[11px] leading-5 text-gray-500">
          {t('wizard.assistant.provider.description')}
        </p>
        {query.data?.configured && (
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
            {t('wizard.assistant.provider.configured')}
          </span>
        )}
      </div>
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
        className="space-y-4"
      >
        <label className="block">
          {t('wizard.assistant.provider.endpoint')}
          <input
            className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-[12px] text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
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
            className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-[12px] text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
            required
            value={model ?? query.data?.model ?? ''}
            onChange={(e) => setModel(e.target.value)}
            disabled={disabled}
          />
        </label>
        <label className="block">
          {t('wizard.assistant.provider.key')}
          <input
            className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-[12px] text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
            type="password"
            autoComplete="off"
            required={!query.data?.configured}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            required
            placeholder={query.data?.configured ? t('wizard.assistant.provider.rotate') : ''}
            disabled={disabled}
          />
        </label>
        <p className="rounded-lg bg-gray-50 px-3 py-2.5 text-[11px] leading-5 text-gray-500">
          {t('wizard.assistant.provider.secretHint')}
        </p>
        <div className="flex flex-wrap items-center gap-2 border-t border-gray-200 pt-4">
          <button
            className="rounded-lg bg-blue-600 px-3 py-2 font-medium text-white hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
            disabled={disabled || !apiKey}
            type="submit"
          >
            {t('wizard.assistant.provider.save')}
          </button>
          <button
            className="rounded-lg border border-gray-300 px-3 py-2 font-medium text-gray-700 hover:bg-gray-50 active:scale-[0.98] disabled:opacity-50"
            disabled={disabled || (!apiKey && !query.data?.configured)}
            type="button"
            onClick={() => mutation.mutate('check')}
          >
            {t('wizard.assistant.provider.check')}
          </button>
          {query.data?.configured && (
            <button
              className="rounded-lg px-3 py-2 text-red-700 hover:bg-red-50 active:scale-[0.98] disabled:opacity-50"
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
