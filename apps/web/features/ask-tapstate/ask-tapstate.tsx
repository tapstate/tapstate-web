import type { ComponentType, SVGProps } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  ArrowUp,
  BarChart2,
  Box,
  ChevronDown,
  Database,
  GitMerge,
  Maximize2,
  Minimize2,
  Paperclip,
  Sparkles,
  Table,
  Terminal,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/stores/ui-store'

type ResourceType = 'DataSource' | 'View' | 'API' | 'DataPreview'

interface Message {
  id: number
  role: 'user' | 'ai'
  content: string
  isStreaming?: boolean
}

interface Segment {
  type: 'text' | 'resource'
  content?: string
  resourceType?: ResourceType
  name?: string
}

const previewColumns = ['date', 'active_users', 'new_users']
const previewRows = [
  { date: '2026-06-30', activeUsers: '1,432,105', newUsers: '12,400' },
  { date: '2026-06-29', activeUsers: '1,428,950', newUsers: '11,920' },
  { date: '2026-06-28', activeUsers: '1,410,200', newUsers: '13,105' },
]

const promptChips: Array<{
  labelKey: string
  promptKey: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}> = [
  { labelKey: 'ask.prompts.source', promptKey: 'ask.prompts.sourcePrompt', icon: Database },
  { labelKey: 'ask.prompts.pipeline', promptKey: 'ask.prompts.pipelinePrompt', icon: GitMerge },
  { labelKey: 'ask.prompts.trends', promptKey: 'ask.prompts.trendsPrompt', icon: BarChart2 },
]

function parseMessageContent(content: string): Segment[] {
  const segments: Segment[] = []
  let lastIndex = 0
  const resourceTypes: ResourceType[] = ['DataSource', 'View', 'API', 'DataPreview']

  while (lastIndex < content.length) {
    const markerStart = content.indexOf('[', lastIndex)
    if (markerStart === -1) {
      segments.push({ type: 'text', content: content.substring(lastIndex) })
      break
    }

    if (markerStart > lastIndex)
      segments.push({ type: 'text', content: content.substring(lastIndex, markerStart) })

    const markerEnd = content.indexOf(']', markerStart + 1)
    if (markerEnd === -1) {
      segments.push({ type: 'text', content: content.substring(markerStart) })
      break
    }

    const token = content.substring(markerStart + 1, markerEnd)
    const separatorIndex = token.indexOf(':')
    const rawType = separatorIndex === -1 ? '' : token.substring(0, separatorIndex)
    const resourceType = resourceTypes.find((type) => type === rawType)

    if (resourceType) {
      segments.push({
        type: 'resource',
        resourceType,
        name: token.substring(separatorIndex + 1).trim(),
      })
    } else {
      segments.push({ type: 'text', content: content.substring(markerStart, markerEnd + 1) })
    }

    lastIndex = markerEnd + 1
  }

  return segments
}

export function AskTapstate() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const isOpen = useUiStore((state) => state.isAskTapstateOpen)
  const setOpen = useUiStore((state) => state.setAskTapstateOpen)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [isSimulating, setIsSimulating] = useState(false)
  const chatContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight })
  }, [messages])

  function mockResponse(input: string) {
    const lowerInput = input.toLowerCase()
    if (
      lowerInput.includes('create') ||
      lowerInput.includes('source') ||
      lowerInput.includes('datasource') ||
      lowerInput.includes('数据源') ||
      lowerInput.includes('创建')
    )
      return t('ask.responses.sourceCreated')
    if (
      lowerInput.includes('query') ||
      lowerInput.includes('view') ||
      lowerInput.includes('查询') ||
      lowerInput.includes('视图')
    )
      return t('ask.responses.queryPreview')
    return t('ask.responses.default')
  }

  function navigateTo(type: ResourceType | undefined) {
    void navigate({ to: type === 'DataSource' ? '/sources' : '/pipelines' })
    setOpen(false)
  }

  async function sendMessage() {
    const trimmedInput = inputText.trim()
    if (!trimmedInput || isSimulating) return

    const userMessage: Message = { id: Date.now(), role: 'user', content: trimmedInput }
    const aiMessageId = Date.now() + 1
    setMessages((current) => [
      ...current,
      userMessage,
      { id: aiMessageId, role: 'ai', content: '', isStreaming: true },
    ])
    setInputText('')
    setIsSimulating(true)

    const responseText = mockResponse(trimmedInput)
    let currentContent = ''

    for (const char of responseText.split('')) {
      await new Promise((resolve) => window.setTimeout(resolve, 6))
      currentContent += char
      setMessages((current) =>
        current.map((message) =>
          message.id === aiMessageId ? { ...message, content: currentContent } : message,
        ),
      )
    }

    setMessages((current) =>
      current.map((message) =>
        message.id === aiMessageId ? { ...message, isStreaming: false } : message,
      ),
    )
    setIsSimulating(false)
  }

  if (!isOpen) return null

  return (
    <aside className="ask-panel" aria-label={t('ask.panelLabel')}>
      <section className="ask-panel__window">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-gray-100 px-4">
          <h3 className="flex items-center gap-2 text-[14px] font-medium text-gray-900">
            <Sparkles className="h-4 w-4 text-purple-500" aria-hidden="true" />
            {t('ask.newChat')}
          </h3>
          <div className="flex items-center gap-1 text-gray-400">
            <button
              className="rounded-md p-1.5 transition-colors hover:bg-gray-100 hover:text-gray-600"
              aria-label={t('ask.actions.minimize')}
            >
              <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              className="rounded-md p-1.5 transition-colors hover:bg-gray-100 hover:text-gray-600"
              aria-label={t('ask.actions.maximize')}
            >
              <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              className="rounded-md p-1.5 transition-colors hover:bg-gray-100 hover:text-gray-600"
              aria-label={t('ask.actions.close')}
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </header>

        {messages.length > 0 ? (
          <div ref={chatContainerRef} className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.map((message) => (
              <div key={message.id} className="flex flex-col gap-1">
                {message.role === 'user' ? (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] break-words rounded-2xl rounded-tr-sm bg-gray-100 px-3 py-2 text-[13px] text-gray-900">
                      {message.content}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-start gap-2">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-100">
                      <Sparkles className="h-3.5 w-3.5 text-purple-600" aria-hidden="true" />
                    </div>
                    <div className="max-w-[85%] text-[13px] leading-relaxed text-gray-900">
                      {message.content === '' && message.isStreaming ? (
                        <div className="flex h-5 items-center gap-1">
                          {[0, 1, 2].map((dot) => (
                            <span
                              key={dot}
                              className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"
                              style={{ animationDelay: `${dot * 150}ms` }}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap leading-normal">
                          {parseMessageContent(message.content).map((segment, index) =>
                            segment.type === 'text' ? (
                              <span key={`${message.id}-${index}`}>{segment.content}</span>
                            ) : segment.resourceType === 'DataPreview' ? (
                              <div
                                key={`${message.id}-${index}`}
                                className="my-2 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
                              >
                                <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-2">
                                  <div className="flex items-center gap-1.5 text-[12px] font-medium text-gray-700">
                                    <Table
                                      className="h-3.5 w-3.5 text-gray-500"
                                      aria-hidden="true"
                                    />
                                    {segment.name}
                                  </div>
                                  <span className="rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] text-gray-400">
                                    {t('ask.preview.rows')}
                                  </span>
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="w-full whitespace-nowrap text-left text-[11px]">
                                    <thead className="bg-white text-gray-500">
                                      <tr>
                                        {previewColumns.map((column) => (
                                          <th
                                            key={column}
                                            className="border-b border-gray-100 px-3 py-1.5 font-medium"
                                          >
                                            {column}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                      {previewRows.map((row) => (
                                        <tr key={row.date} className="hover:bg-gray-50/50">
                                          <td className="px-3 py-1.5 text-gray-600">{row.date}</td>
                                          <td className="px-3 py-1.5 font-mono text-gray-900">
                                            {row.activeUsers}
                                          </td>
                                          <td className="px-3 py-1.5 font-mono text-gray-900">
                                            {row.newUsers}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ) : (
                              <button
                                key={`${message.id}-${index}`}
                                className={cn(
                                  'mx-0.5 inline-flex cursor-pointer items-center gap-1 rounded border px-1.5 py-0.5 align-baseline font-mono text-[12px] transition-all hover:shadow-sm',
                                  segment.resourceType === 'DataSource'
                                    ? 'border-gray-200 bg-gray-100 text-gray-800 hover:bg-gray-200'
                                    : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100',
                                )}
                                onClick={() => navigateTo(segment.resourceType)}
                              >
                                {segment.resourceType === 'DataSource' ? (
                                  <Database className="h-3 w-3" aria-hidden="true" />
                                ) : (
                                  <Table className="h-3 w-3" aria-hidden="true" />
                                )}
                                {segment.name}
                              </button>
                            ),
                          )}
                          {message.isStreaming && (
                            <span className="ml-1 inline-block h-3.5 w-1.5 animate-pulse bg-purple-500 align-middle" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center bg-gray-50/50 p-6">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm">
              <Terminal className="h-6 w-6 text-gray-900" aria-hidden="true" />
            </div>
            <h2 className="mb-2 text-[15px] font-semibold text-gray-900">
              {t('ask.welcome.title')}
            </h2>
            <p className="mb-6 max-w-[280px] text-center text-[13px] text-gray-500">
              {t('ask.welcome.body')}
            </p>

            <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
              {promptChips.map((prompt) => {
                const Icon = prompt.icon
                return (
                  <button
                    key={prompt.labelKey}
                    className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[12px] font-medium text-gray-700 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50"
                    onClick={() => setInputText(t(prompt.promptKey))}
                  >
                    <Icon className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
                    {t(prompt.labelKey)}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <footer className="shrink-0 border-t border-gray-100 bg-white p-3">
          <div className="relative flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all focus-within:border-gray-400 focus-within:ring-1 focus-within:ring-gray-400">
            <textarea
              value={inputText}
              rows={1}
              className="max-h-[120px] min-h-[44px] w-full resize-none bg-transparent px-3 py-3 text-[13px] text-gray-900 outline-none placeholder:text-gray-400"
              placeholder={t('ask.input.placeholder')}
              onChange={(event) => setInputText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  void sendMessage()
                }
              }}
            />

            <div className="flex items-center justify-between bg-white px-2 py-1.5">
              <button className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium text-gray-600 transition-colors hover:bg-gray-100">
                <Box className="h-3.5 w-3.5" aria-hidden="true" />
                {t('ask.skills')}
                <ChevronDown className="h-3 w-3" aria-hidden="true" />
              </button>
              <div className="flex items-center gap-1">
                <button
                  className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                  aria-label={t('ask.actions.attach')}
                >
                  <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                  className="ml-1 flex h-7 w-7 items-center justify-center rounded-md bg-gray-900 text-white transition-colors hover:bg-gray-800 disabled:opacity-50 disabled:hover:bg-gray-900"
                  disabled={isSimulating || !inputText.trim()}
                  aria-label={t('ask.actions.send')}
                  onClick={() => void sendMessage()}
                >
                  <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </footer>
      </section>
    </aside>
  )
}
