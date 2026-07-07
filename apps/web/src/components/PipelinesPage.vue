<script setup lang="ts">
import type { Component } from 'vue'
import {
  Activity,
  Braces,
  ChevronDown,
  Clock,
  Database,
  GitMerge,
  LayoutTemplate,
  MoreHorizontal,
  Network,
  Plus,
  Sparkles,
  Table,
  Zap,
} from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import TreeItem from './TreeItem.vue'
import WizardBuilder from './WizardBuilder.vue'

type NodeStatus = 'running' | 'paused' | 'error'
export type TreeNodeType = 'pipeline' | 'view' | 'api'

export interface TreeNode {
  id: string
  name: string
  type: TreeNodeType
  children?: TreeNode[]
  status?: NodeStatus
}

const { t } = useI18n()
const expandedIds = ref<Set<string>>(new Set(['p1', 'p2']))
const selectedId = ref<string | null>(null)
const isCreateOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)
const creationMode = ref<'wizard' | null>(null)

const createModes: Array<{
  value: 'wizard' | 'sql' | 'dag' | 'ai'
  labelKey: string
  descriptionKey: string
  icon: Component
  iconClass: string
}> = [
  { value: 'wizard', labelKey: 'pipelines.createMenu.wizard', descriptionKey: 'pipelines.createMenu.wizardDescription', icon: LayoutTemplate, iconClass: 'bg-gray-100 text-gray-600 group-hover:bg-gray-200' },
  { value: 'sql', labelKey: 'pipelines.createMenu.sql', descriptionKey: 'pipelines.createMenu.sqlDescription', icon: Database, iconClass: 'bg-blue-50 text-blue-600 group-hover:bg-blue-100' },
  { value: 'dag', labelKey: 'pipelines.createMenu.dag', descriptionKey: 'pipelines.createMenu.dagDescription', icon: Network, iconClass: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100' },
  { value: 'ai', labelKey: 'pipelines.createMenu.ai', descriptionKey: 'pipelines.createMenu.aiDescription', icon: Sparkles, iconClass: 'bg-purple-50 text-purple-600 group-hover:bg-purple-100' },
]

const treeData: TreeNode[] = [
  {
    id: 'p1',
    name: 'User Data Sync',
    type: 'pipeline',
    status: 'running',
    children: [
      { id: 'v1', name: 'Active Users View', type: 'view' },
      { id: 'v2', name: 'Premium Users View', type: 'view' },
      { id: 'a1', name: 'User Profile API', type: 'api', status: 'running' },
    ],
  },
  {
    id: 'p2',
    name: 'Order Analytics',
    type: 'pipeline',
    status: 'paused',
    children: [
      { id: 'v3', name: 'Daily Revenue', type: 'view' },
      { id: 'a2', name: 'Orders GraphQL', type: 'api', status: 'paused' },
    ],
  },
]

const viewMetrics = [
  { labelKey: 'pipelines.metrics.totalRows', value: '1,234,567', icon: Table },
  { labelKey: 'pipelines.metrics.storageSize', value: '456 MB', icon: Database },
  { labelKey: 'pipelines.metrics.delay', value: '12 ms', icon: Clock },
]

const apiMetrics = [
  { labelKey: 'pipelines.metrics.requests', value: '892', icon: Activity },
  { labelKey: 'pipelines.metrics.latency', value: '45 ms', icon: Clock },
]

const schemaFields = [
  { name: 'id', type: 'UUID', descriptionKey: 'pipelines.schema.idDescription' },
  { name: 'created_at', type: 'TIMESTAMP', descriptionKey: 'pipelines.schema.createdAtDescription' },
  { name: 'event_name', type: 'VARCHAR', descriptionKey: 'pipelines.schema.eventNameDescription' },
]

const previewRows = [
  { id: 'a1b2c3d4...', createdAt: '2026-06-29 10:00:00', eventName: 'page_view' },
  { id: 'e5f6g7h8...', createdAt: '2026-06-29 10:05:12', eventName: 'button_click' },
]

const apiEndpoint = 'https://api.cyntex.dev/v1/user_profile'
const responsePreview = `{
  "data": [
    {
      "id": "usr_9a8b7c6d",
      "email": "user@example.com",
      "created_at": "2026-01-15T08:30:00Z"
    }
  ],
  "meta": {
    "total_count": 1,
    "latency_ms": 42
  }
}`

const selectedNode = computed(() => {
  if (!selectedId.value)
    return null
  return treeData.find(node => node.id === selectedId.value)
    ?? treeData.flatMap(node => node.children ?? []).find(node => node.id === selectedId.value)
    ?? null
})

const displayItems = computed(() => selectedNode.value?.children ?? treeData)

function handleClickOutside(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isCreateOpen.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', handleClickOutside))
onUnmounted(() => document.removeEventListener('mousedown', handleClickOutside))

function toggleExpand(id: string) {
  const nextExpanded = new Set(expandedIds.value)
  if (nextExpanded.has(id)) {
    nextExpanded.delete(id)
  }
  else {
    nextExpanded.add(id)
  }
  expandedIds.value = nextExpanded
}

function setSelectedId(id: string | null) {
  selectedId.value = id
}

function selectCreateMode(mode: 'wizard' | 'sql' | 'dag' | 'ai') {
  isCreateOpen.value = false
  if (mode === 'wizard') {
    creationMode.value = 'wizard'
  }
}

function nodeIcon(type: TreeNodeType): Component {
  if (type === 'view')
    return Table
  if (type === 'api')
    return Zap
  return GitMerge
}

function nodeIconColor(type: TreeNodeType) {
  if (type === 'view')
    return 'text-indigo-500'
  if (type === 'api')
    return 'text-emerald-500'
  return 'text-blue-500'
}

function nodeTypeLabelKey(type: TreeNodeType) {
  if (type === 'view')
    return 'pipelines.type.view'
  if (type === 'api')
    return 'pipelines.type.api'
  return 'pipelines.type.pipeline'
}

function statusLabelKey(status: NodeStatus) {
  if (status === 'paused')
    return 'pipelines.status.paused'
  if (status === 'error')
    return 'pipelines.status.error'
  return 'pipelines.status.running'
}

function statusDotClass(status: NodeStatus) {
  if (status === 'paused')
    return 'bg-yellow-500'
  if (status === 'error')
    return 'bg-red-500'
  return 'bg-green-500'
}

function statusClass(status: NodeStatus) {
  if (status === 'paused')
    return 'bg-yellow-50 text-yellow-800 ring-yellow-600/20'
  if (status === 'error')
    return 'bg-red-50 text-red-700 ring-red-600/20'
  return 'bg-green-50 text-green-700 ring-green-600/20'
}
</script>

<template>
  <section class="flex h-full w-full flex-col overflow-hidden bg-white">
    <header v-if="creationMode !== 'wizard'" class="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-gray-100/70 px-4 md:px-6">
      <h1 class="min-w-0 truncate text-[15px] font-semibold text-gray-900">
        {{ t('pipelines.title') }}
      </h1>

      <div ref="dropdownRef" class="flex shrink-0 items-center gap-2">
        <div class="relative">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-gray-900 px-3 py-1.5 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-gray-800"
            @click="isCreateOpen = !isCreateOpen"
          >
            <Plus class="h-3.5 w-3.5" aria-hidden="true" />
            {{ t('common.create') }}
            <ChevronDown class="-mr-1 ml-0.5 h-3.5 w-3.5 opacity-70" aria-hidden="true" />
          </button>

          <div v-if="isCreateOpen" class="absolute right-0 z-50 mt-1.5 w-72 overflow-hidden rounded-[var(--radius)] border border-gray-200/70 bg-white py-1.5 shadow-[0_12px_40px_rgba(15,23,42,0.12)]">
            <div class="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              {{ t('pipelines.createMenu.title') }}
            </div>
            <button
              v-for="mode in createModes"
              :key="mode.labelKey"
              type="button"
              class="group flex w-full items-start gap-3 px-3 py-2 text-left transition-colors hover:bg-gray-50"
              @click="selectCreateMode(mode.value)"
            >
              <span class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors" :class="[mode.iconClass]">
                <component :is="mode.icon" class="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <span class="min-w-0">
                <span class="block text-[13px] font-medium text-gray-900">{{ t(mode.labelKey) }}</span>
                <span class="block text-[11px] text-gray-500">{{ t(mode.descriptionKey) }}</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>

    <WizardBuilder v-if="creationMode === 'wizard'" @back="creationMode = null" />

    <div v-else class="flex min-h-0 flex-1 flex-col bg-white md:flex-row">
      <aside class="flex w-full shrink-0 flex-col border-b border-gray-100/70 bg-[#fcfcfd]/80 md:w-64 md:border-b-0 md:border-r">
        <div class="flex items-center justify-between border-b border-gray-100/70 p-3">
          <h2 class="ml-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            {{ t('pipelines.explorer') }}
          </h2>
        </div>
        <div class="flex min-h-[160px] flex-1 gap-1 overflow-auto p-2 md:flex-col">
          <button
            type="button"
            class="flex min-w-[160px] items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors md:min-w-0"
            :class="selectedId === null ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-50'"
            @click="setSelectedId(null)"
          >
            <GitMerge class="h-4 w-4 text-gray-400" aria-hidden="true" />
            <span>{{ t('pipelines.allPipelines') }}</span>
          </button>

          <TreeItem
            v-for="node in treeData"
            :key="node.id"
            :node="node"
            :expanded-ids="expandedIds"
            :selected-id="selectedId"
            @toggle="toggleExpand"
            @select="setSelectedId"
          />
        </div>
      </aside>

      <main class="flex min-w-0 flex-1 flex-col bg-white">
        <div v-if="selectedNode" class="flex h-14 shrink-0 items-center justify-between border-b border-gray-100/70 px-4 md:px-6">
          <div class="flex min-w-0 items-center gap-2">
            <component :is="nodeIcon(selectedNode.type)" class="h-4 w-4 shrink-0" :class="[nodeIconColor(selectedNode.type)]" aria-hidden="true" />
            <h2 class="truncate text-[14px] font-semibold text-gray-900">
              {{ selectedNode.name }}
            </h2>
            <span v-if="selectedNode.status" class="text-gray-200">{{ t('common.separator') }}</span>
            <span
              v-if="selectedNode.status"
              class="inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset"
              :class="statusClass(selectedNode.status)"
            >
              <span class="h-1 w-1 rounded-full" :class="statusDotClass(selectedNode.status)" aria-hidden="true" />
              {{ t(statusLabelKey(selectedNode.status)) }}
            </span>
          </div>
        </div>

        <div class="min-h-0 flex-1 overflow-auto bg-white p-4 md:p-6">
          <div v-if="!selectedNode || selectedNode.type === 'pipeline'" class="overflow-hidden rounded-lg border border-gray-200/70">
            <div class="overflow-x-auto">
              <table class="w-full min-w-[720px] text-left text-[13px]">
                <thead class="border-b border-gray-200/70 bg-gray-50/70 text-gray-500">
                  <tr>
                    <th class="px-4 py-3 font-medium">
                      {{ t('pipelines.table.resourceName') }}
                    </th>
                    <th class="px-4 py-3 font-medium">
                      {{ t('pipelines.table.type') }}
                    </th>
                    <th class="px-4 py-3 font-medium">
                      {{ t('pipelines.table.status') }}
                    </th>
                    <th class="px-4 py-3 font-medium">
                      {{ t('pipelines.table.modified') }}
                    </th>
                    <th class="px-4 py-3 text-right font-medium">
                      {{ t('common.actions') }}
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100/70">
                  <tr v-for="child in displayItems" :key="child.id" class="group transition-colors hover:bg-gray-50/70">
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-2.5">
                        <div class="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] border border-gray-200/70 bg-gray-50">
                          <component :is="nodeIcon(child.type)" class="h-3.5 w-3.5" :class="[nodeIconColor(child.type)]" aria-hidden="true" />
                        </div>
                        <span class="font-medium text-gray-900">{{ child.name }}</span>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-gray-500">
                      {{ t(nodeTypeLabelKey(child.type)) }}
                    </td>
                    <td class="px-4 py-3">
                      <span v-if="child.status" class="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[11px] font-medium text-gray-600">
                        <span class="h-1.5 w-1.5 rounded-full" :class="statusDotClass(child.status)" aria-hidden="true" />
                        {{ t(statusLabelKey(child.status)) }}
                      </span>
                      <span v-else class="text-[11px] font-medium text-gray-500">{{ t('pipelines.status.ready') }}</span>
                    </td>
                    <td class="px-4 py-3 text-gray-500">
                      <span class="inline-flex items-center gap-1.5">
                        <Clock class="h-3.5 w-3.5" aria-hidden="true" />
                        {{ t('pipelines.modified.twoHoursAgo') }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-right">
                      <button class="rounded-md p-1 text-gray-400 opacity-0 transition-colors hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100" :aria-label="t('common.more')">
                        <MoreHorizontal class="h-4 w-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div v-else-if="selectedNode.type === 'view'" class="max-w-4xl space-y-6">
            <div class="grid gap-4 md:grid-cols-3">
              <article v-for="metric in viewMetrics" :key="metric.labelKey" class="rounded-[var(--radius)] border border-gray-100/70 bg-gray-50/40 p-4">
                <div class="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-gray-500">
                  <component :is="metric.icon" class="h-3.5 w-3.5" aria-hidden="true" />
                  {{ t(metric.labelKey) }}
                </div>
                <div class="text-2xl font-semibold text-gray-900">
                  {{ metric.value }}
                </div>
              </article>
            </div>

            <section>
              <h3 class="mb-3 text-[13px] font-semibold text-gray-900">
                {{ t('pipelines.schema.title') }}
              </h3>
              <div class="overflow-hidden rounded-lg border border-gray-200/70">
                <table class="w-full min-w-[540px] text-left text-[13px]">
                  <thead class="border-b border-gray-200/70 bg-gray-50/70 text-gray-500">
                    <tr>
                      <th class="px-4 py-2.5 font-medium">
                        {{ t('pipelines.schema.column') }}
                      </th>
                      <th class="px-4 py-2.5 font-medium">
                        {{ t('pipelines.schema.type') }}
                      </th>
                      <th class="px-4 py-2.5 font-medium">
                        {{ t('pipelines.schema.description') }}
                      </th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100/70">
                    <tr v-for="field in schemaFields" :key="field.name">
                      <td class="px-4 py-2.5 font-medium text-gray-900">
                        {{ field.name }}
                      </td>
                      <td class="px-4 py-2.5">
                        <span class="rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-[11px] text-indigo-600">{{ field.type }}</span>
                      </td>
                      <td class="px-4 py-2.5 text-gray-500">
                        {{ t(field.descriptionKey) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h3 class="mb-3 text-[13px] font-semibold text-gray-900">
                {{ t('pipelines.preview.title') }}
              </h3>
              <div class="overflow-hidden rounded-lg border border-gray-200/70">
                <div class="overflow-x-auto">
                  <table class="w-full min-w-[520px] whitespace-nowrap text-left text-[13px]">
                    <thead class="border-b border-gray-200/70 bg-gray-50/70 text-gray-500">
                      <tr>
                        <th class="px-4 py-2.5 font-medium">
                          {{ t('pipelines.preview.id') }}
                        </th>
                        <th class="px-4 py-2.5 font-medium">
                          {{ t('pipelines.preview.createdAt') }}
                        </th>
                        <th class="px-4 py-2.5 font-medium">
                          {{ t('pipelines.preview.eventName') }}
                        </th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100/70 font-mono text-[12px] text-gray-600">
                      <tr v-for="row in previewRows" :key="row.id">
                        <td class="px-4 py-2 text-gray-400">
                          {{ row.id }}
                        </td>
                        <td class="px-4 py-2">
                          {{ row.createdAt }}
                        </td>
                        <td class="px-4 py-2 text-gray-900">
                          {{ row.eventName }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>

          <div v-else class="max-w-4xl space-y-6">
            <div class="grid gap-4 md:grid-cols-2">
              <article v-for="metric in apiMetrics" :key="metric.labelKey" class="rounded-[var(--radius)] border border-gray-100/70 bg-gray-50/40 p-4">
                <div class="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-gray-500">
                  <component :is="metric.icon" class="h-3.5 w-3.5" aria-hidden="true" />
                  {{ t(metric.labelKey) }}
                </div>
                <div class="text-2xl font-semibold text-gray-900">
                  {{ metric.value }}
                </div>
              </article>
            </div>

            <div class="grid gap-4 lg:grid-cols-2">
              <section class="space-y-3">
                <h3 class="text-[13px] font-semibold text-gray-900">
                  {{ t('pipelines.api.endpoint') }}
                </h3>
                <div class="flex items-center gap-2 rounded-md border border-gray-200/70 bg-gray-50/60 p-2.5">
                  <span class="rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-bold text-emerald-600">{{ t('pipelines.api.method') }}</span>
                  <code class="truncate font-mono text-[12px] text-gray-700">{{ apiEndpoint }}</code>
                </div>
              </section>

              <section class="space-y-3">
                <h3 class="text-[13px] font-semibold text-gray-900">
                  {{ t('pipelines.api.auth') }}
                </h3>
                <div class="rounded-md border border-gray-200/70 bg-gray-50/60 p-2.5 text-[12px] text-gray-600">
                  {{ t('pipelines.api.authBody') }}
                </div>
              </section>
            </div>

            <section>
              <h3 class="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-gray-900">
                <Braces class="h-4 w-4 text-gray-400" aria-hidden="true" />
                {{ t('pipelines.api.responsePreview') }}
              </h3>
              <pre class="overflow-x-auto rounded-lg bg-[#1e1e1e] p-4 font-mono text-[12px] leading-relaxed text-gray-300 shadow-sm">{{ responsePreview }}</pre>
            </section>
          </div>
        </div>
      </main>
    </div>
  </section>
</template>
