<script setup lang="ts">
import type { Component } from 'vue'
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
} from 'lucide-vue-next'
import { nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useUiStore } from '@/stores/uiState'

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

const uiStore = useUiStore()
const router = useRouter()
const { t } = useI18n()

const messages = ref<Message[]>([])
const inputText = ref('')
const isSimulating = ref(false)
const chatContainerRef = ref<HTMLElement | null>(null)

const previewColumns = ['date', 'active_users', 'new_users']
const previewRows = [
  { date: '2026-06-30', activeUsers: '1,432,105', newUsers: '12,400' },
  { date: '2026-06-29', activeUsers: '1,428,950', newUsers: '11,920' },
  { date: '2026-06-28', activeUsers: '1,410,200', newUsers: '13,105' },
]

const promptChips: Array<{ labelKey: string, promptKey: string, icon: Component }> = [
  { labelKey: 'ask.prompts.source', promptKey: 'ask.prompts.sourcePrompt', icon: Database },
  { labelKey: 'ask.prompts.pipeline', promptKey: 'ask.prompts.pipelinePrompt', icon: GitMerge },
  { labelKey: 'ask.prompts.trends', promptKey: 'ask.prompts.trendsPrompt', icon: BarChart2 },
]

async function scrollToBottom() {
  await nextTick()
  if (chatContainerRef.value) {
    chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight
  }
}

function mockResponse(input: string) {
  const lowerInput = input.toLowerCase()
  if (lowerInput.includes('create') || lowerInput.includes('source') || lowerInput.includes('datasource') || lowerInput.includes('数据源') || lowerInput.includes('创建')) {
    return t('ask.responses.sourceCreated')
  }
  if (lowerInput.includes('query') || lowerInput.includes('view') || lowerInput.includes('查询') || lowerInput.includes('视图')) {
    return t('ask.responses.queryPreview')
  }
  return t('ask.responses.default')
}

function parseMessageContent(content: string): Segment[] {
  const segments: Segment[] = []
  let lastIndex = 0
  const markerPattern = '['
  const resourceTypes: ResourceType[] = ['DataSource', 'View', 'API', 'DataPreview']

  while (lastIndex < content.length) {
    const markerStart = content.indexOf(markerPattern, lastIndex)
    if (markerStart === -1) {
      segments.push({ type: 'text', content: content.substring(lastIndex) })
      break
    }

    if (markerStart > lastIndex) {
      segments.push({ type: 'text', content: content.substring(lastIndex, markerStart) })
    }

    const markerEnd = content.indexOf(']', markerStart + 1)
    if (markerEnd === -1) {
      segments.push({ type: 'text', content: content.substring(markerStart) })
      break
    }

    const token = content.substring(markerStart + 1, markerEnd)
    const separatorIndex = token.indexOf(':')
    const rawType = separatorIndex === -1 ? '' : token.substring(0, separatorIndex)
    const resourceType = resourceTypes.find(type => type === rawType)

    if (resourceType) {
      const name = token.substring(separatorIndex + 1).trim()
      segments.push({ type: 'resource', resourceType, name })
    }
    else {
      segments.push({ type: 'text', content: content.substring(markerStart, markerEnd + 1) })
    }

    lastIndex = markerEnd + 1
  }

  return segments
}

function navigateTo(type: ResourceType | undefined) {
  if (type === 'DataSource') {
    router.push('/sources')
  }
  else {
    router.push('/pipelines')
  }
  uiStore.isAskTapstateOpen = false
}

async function sendMessage() {
  const trimmedInput = inputText.value.trim()
  if (!trimmedInput || isSimulating.value)
    return

  messages.value.push({
    id: Date.now(),
    role: 'user',
    content: trimmedInput,
  })

  inputText.value = ''
  isSimulating.value = true
  await scrollToBottom()

  const aiMessageId = Date.now() + 1
  messages.value.push({
    id: aiMessageId,
    role: 'ai',
    content: '',
    isStreaming: true,
  })

  await scrollToBottom()

  const responseText = mockResponse(trimmedInput)
  let currentContent = ''

  for (const char of responseText.split('')) {
    await new Promise(resolve => window.setTimeout(resolve, 6))
    currentContent += char
    const aiMessage = messages.value.find(message => message.id === aiMessageId)
    if (aiMessage) {
      aiMessage.content = currentContent
    }
    await scrollToBottom()
  }

  const finalAiMessage = messages.value.find(message => message.id === aiMessageId)
  if (finalAiMessage) {
    finalAiMessage.isStreaming = false
  }
  isSimulating.value = false
}
</script>

<template>
  <Transition name="fade-slide">
    <aside v-if="uiStore.isAskTapstateOpen" class="ask-panel" :aria-label="t('ask.panelLabel')">
      <section class="ask-panel__window">
        <header class="flex h-12 shrink-0 items-center justify-between border-b border-gray-100 px-4">
          <h3 class="flex items-center gap-2 text-[14px] font-medium text-gray-900">
            <Sparkles class="h-4 w-4 text-purple-500" aria-hidden="true" />
            {{ t('ask.newChat') }}
          </h3>
          <div class="flex items-center gap-1 text-gray-400">
            <button class="rounded-md p-1.5 transition-colors hover:bg-gray-100 hover:text-gray-600" :aria-label="t('ask.actions.minimize')">
              <Minimize2 class="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button class="rounded-md p-1.5 transition-colors hover:bg-gray-100 hover:text-gray-600" :aria-label="t('ask.actions.maximize')">
              <Maximize2 class="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button class="rounded-md p-1.5 transition-colors hover:bg-gray-100 hover:text-gray-600" :aria-label="t('ask.actions.close')" @click="uiStore.isAskTapstateOpen = false">
              <X class="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div v-if="messages.length > 0" ref="chatContainerRef" class="flex-1 space-y-4 overflow-y-auto p-4">
          <div v-for="message in messages" :key="message.id" class="flex flex-col gap-1">
            <div v-if="message.role === 'user'" class="flex justify-end">
              <div class="max-w-[85%] break-words rounded-2xl rounded-tr-sm bg-gray-100 px-3 py-2 text-[13px] text-gray-900">
                {{ message.content }}
              </div>
            </div>

            <div v-else class="flex items-start justify-start gap-2">
              <div class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-100">
                <Sparkles class="h-3.5 w-3.5 text-purple-600" aria-hidden="true" />
              </div>
              <div class="max-w-[85%] text-[13px] leading-relaxed text-gray-900">
                <div v-if="message.content === '' && message.isStreaming" class="flex h-5 items-center gap-1">
                  <span v-for="dot in 3" :key="dot" class="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" :style="{ animationDelay: `${(dot - 1) * 150}ms` }" />
                </div>
                <div v-else class="whitespace-pre-wrap leading-normal">
                  <template v-for="(segment, index) in parseMessageContent(message.content)" :key="`${message.id}-${index}`">
                    <span v-if="segment.type === 'text'">{{ segment.content }}</span>

                    <div v-else-if="segment.resourceType === 'DataPreview'" class="my-2 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                      <div class="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-2">
                        <div class="flex items-center gap-1.5 text-[12px] font-medium text-gray-700">
                          <Table class="h-3.5 w-3.5 text-gray-500" aria-hidden="true" />
                          {{ segment.name }}
                        </div>
                        <span class="rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] text-gray-400">
                          {{ t('ask.preview.rows') }}
                        </span>
                      </div>
                      <div class="overflow-x-auto">
                        <table class="w-full whitespace-nowrap text-left text-[11px]">
                          <thead class="bg-white text-gray-500">
                            <tr>
                              <th v-for="column in previewColumns" :key="column" class="border-b border-gray-100 px-3 py-1.5 font-medium">
                                {{ column }}
                              </th>
                            </tr>
                          </thead>
                          <tbody class="divide-y divide-gray-50">
                            <tr v-for="row in previewRows" :key="row.date" class="hover:bg-gray-50/50">
                              <td class="px-3 py-1.5 text-gray-600">
                                {{ row.date }}
                              </td>
                              <td class="px-3 py-1.5 font-mono text-gray-900">
                                {{ row.activeUsers }}
                              </td>
                              <td class="px-3 py-1.5 font-mono text-gray-900">
                                {{ row.newUsers }}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <button
                      v-else
                      class="mx-0.5 inline-flex cursor-pointer items-center gap-1 rounded border px-1.5 py-0.5 align-baseline font-mono text-[12px] transition-all hover:shadow-sm"
                      :class="segment.resourceType === 'DataSource'
                        ? 'border-gray-200 bg-gray-100 text-gray-800 hover:bg-gray-200'
                        : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'"
                      @click="navigateTo(segment.resourceType)"
                    >
                      <Database v-if="segment.resourceType === 'DataSource'" class="h-3 w-3" aria-hidden="true" />
                      <Table v-else class="h-3 w-3" aria-hidden="true" />
                      {{ segment.name }}
                    </button>
                  </template>
                  <span v-if="message.isStreaming" class="ml-1 inline-block h-3.5 w-1.5 animate-pulse bg-purple-500 align-middle" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="flex flex-1 flex-col items-center justify-center bg-gray-50/50 p-6">
          <div class="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm">
            <Terminal class="h-6 w-6 text-gray-900" aria-hidden="true" />
          </div>
          <h2 class="mb-2 text-[15px] font-semibold text-gray-900">
            {{ t('ask.welcome.title') }}
          </h2>
          <p class="mb-6 max-w-[280px] text-center text-[13px] text-gray-500">
            {{ t('ask.welcome.body') }}
          </p>

          <div class="mb-8 flex flex-wrap items-center justify-center gap-2">
            <button
              v-for="prompt in promptChips"
              :key="prompt.labelKey"
              class="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[12px] font-medium text-gray-700 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50"
              @click="inputText = t(prompt.promptKey)"
            >
              <component :is="prompt.icon" class="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
              {{ t(prompt.labelKey) }}
            </button>
          </div>

          <div class="w-full space-y-2 text-center text-[12px] text-gray-500">
            <div class="flex items-center justify-center gap-2">
              <kbd class="rounded border border-gray-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-gray-500">{{ t('ask.shortcuts.mentionKey') }}</kbd>
              <span>{{ t('ask.shortcuts.mention') }}</span>
            </div>
            <div class="flex items-center justify-center gap-2">
              <kbd class="rounded border border-gray-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-gray-500">{{ t('ask.shortcuts.contextKey') }}</kbd>
              <span>{{ t('ask.shortcuts.context') }}</span>
            </div>
          </div>
        </div>

        <footer class="shrink-0 border-t border-gray-100 bg-white p-3">
          <div class="relative flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all focus-within:border-gray-400 focus-within:ring-1 focus-within:ring-gray-400">
            <textarea
              v-model="inputText"
              rows="1"
              class="max-h-[120px] min-h-[44px] w-full resize-none bg-transparent px-3 py-3 text-[13px] text-gray-900 outline-none placeholder:text-gray-400"
              :placeholder="t('ask.input.placeholder')"
              @keydown.enter.prevent="sendMessage"
            />

            <div class="flex items-center justify-between bg-white px-2 py-1.5">
              <button class="flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium text-gray-600 transition-colors hover:bg-gray-100">
                <Box class="h-3.5 w-3.5" aria-hidden="true" />
                {{ t('ask.skills') }}
                <ChevronDown class="h-3 w-3" aria-hidden="true" />
              </button>
              <div class="flex items-center gap-1">
                <button class="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600" :aria-label="t('ask.actions.attach')">
                  <Paperclip class="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                  class="ml-1 flex h-7 w-7 items-center justify-center rounded-md bg-gray-900 text-white transition-colors hover:bg-gray-800 disabled:opacity-50 disabled:hover:bg-gray-900"
                  :disabled="isSimulating || !inputText.trim()"
                  :aria-label="t('ask.actions.send')"
                  @click="sendMessage"
                >
                  <ArrowUp class="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </footer>
      </section>
    </aside>
  </Transition>
</template>

<style scoped>
.ask-panel {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 50;
}

.ask-panel__window {
  display: flex;
  width: min(400px, calc(100vw - 32px));
  height: min(550px, calc(100vh - 48px));
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(229, 231, 235, 0.8);
  border-radius: 16px;
  background: white;
  box-shadow: 0 22px 70px rgba(15, 23, 42, 0.18);
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  transform-origin: bottom right;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(10px);
}

@media (max-width: 760px) {
  .ask-panel {
    right: 12px;
    bottom: 12px;
    left: 12px;
  }

  .ask-panel__window {
    width: 100%;
    height: min(580px, calc(100vh - 24px));
  }
}
</style>
