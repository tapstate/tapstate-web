<script setup lang="ts">
import type { Component } from 'vue'
import type { SourceTableView, SourceView } from '@/services/sourceClient'
import { ElMessage } from 'element-plus'
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  Cloud,
  Columns,
  Database,
  FileText,
  GitMerge,
  HardDrive,
  Leaf,
  ListFilter,
  LoaderCircle,
  Maximize2,
  MoreHorizontal,
  Plus,
  Search,
  Server,
  Settings,
  Table as TableIcon,
} from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { listSources, SourceClientError } from '@/services/sourceClient'
import { useAuthStore } from '@/stores/auth'
import SourceCreateDialog from './SourceCreateDialog.vue'

type SourceTab = 'data' | 'columns' | 'settings' | 'lineage' | 'log'

interface SourceTable {
  id: string
  name: string
  type: string
  rows: string
  size: string
  lastSync: string
  ingestedRows: string
  quarantine: string
  endpoint: string
}

interface Source {
  raw: SourceView
  id: string
  name: string
  type: string
  host: string
  tables: SourceTable[]
}

const { t } = useI18n()
const auth = useAuthStore()
const searchText = ref('')
const connectionStatusFilter = ref('all')
const activeTab = ref<SourceTab>('data')
const sources = ref<Source[]>([])
const selectedSource = ref<Source | null>(null)
const selectedTable = ref<SourceTable | null>(null)
const loading = ref(true)
const loadError = ref('')
const createOpen = ref(false)

const tabs: Array<{ value: SourceTab, labelKey: string }> = [
  { value: 'data', labelKey: 'sources.tabs.data' },
  { value: 'columns', labelKey: 'sources.tabs.columns' },
  { value: 'settings', labelKey: 'sources.tabs.settings' },
  { value: 'lineage', labelKey: 'sources.tabs.lineage' },
  { value: 'log', labelKey: 'sources.tabs.log' },
]

const connectionStatusOptions = [
  { value: 'all', labelKey: 'sources.filters.connectionStatus.all' },
]

const filteredSources = computed(() => {
  const query = searchText.value.trim().toLowerCase()
  if (!query)
    return sources.value

  return sources.value.filter(source =>
    source.name.toLowerCase().includes(query)
    || source.type.toLowerCase().includes(query)
    || source.host.toLowerCase().includes(query),
  )
})

const activeTabLabel = computed(() =>
  t(tabs.find(tab => tab.value === activeTab.value)?.labelKey ?? 'sources.tabs.data'),
)

watch(filteredSources, (items) => {
  if (selectedSource.value && !items.some(source => source.id === selectedSource.value?.id))
    selectSource(null)
})

onMounted(load)

async function load(preferredId?: string) {
  loading.value = true
  loadError.value = ''
  try {
    sources.value = (await listSources(auth.apiFetch)).map(toSource)
    if (preferredId)
      selectSource(sources.value.find(source => source.id === preferredId) ?? null)
    else if (selectedSource.value)
      selectSource(sources.value.find(source => source.id === selectedSource.value?.id) ?? null)
  }
  catch (error) {
    loadError.value = error instanceof SourceClientError && error.kind === 'network'
      ? t('sources.states.network')
      : t('sources.states.error')
  }
  finally {
    loading.value = false
  }
}

function toSource(source: SourceView): Source {
  return {
    raw: source,
    id: source.id,
    name: source.id,
    type: source.connector,
    host: sourceEndpoint(source),
    tables: (source.tables ?? []).map((table, index) => toTable(table, index)),
  }
}

function toTable(table: SourceTableView, index: number): SourceTable {
  const name = table.name ?? table.pattern ?? table.filter ?? t('sources.details.unnamedTable')
  return {
    id: `${table.type}-${name}-${index}`,
    name,
    type: table.type,
    rows: '—',
    size: '—',
    lastSync: '—',
    ingestedRows: '—',
    quarantine: '—',
    endpoint: t('sources.details.endpointUnavailable'),
  }
}

function sourceEndpoint(source: SourceView) {
  const candidates = ['host', 'hostname', 'server', 'url', 'uri', 'connectionString', 'bootstrapServers']
  for (const key of candidates) {
    const value = source.config[key]
    if (typeof value === 'string' && value)
      return value
  }
  return t('sources.details.endpointUnavailable')
}

function onCreated(created: SourceView) {
  const source = toSource(created)
  sources.value = [...sources.value.filter(item => item.id !== source.id), source]
    .sort((left, right) => left.id.localeCompare(right.id))
  selectSource(source)
  ElMessage.success(t('sources.create.success', { id: source.id }))
}

function selectSource(source: Source | null) {
  selectedSource.value = source
  selectedTable.value = null
  activeTab.value = 'data'
}

function selectTable(table: SourceTable) {
  selectedTable.value = table
  activeTab.value = 'data'
}

function tabIcon(tabName: SourceTab): Component {
  switch (tabName) {
    case 'settings':
      return Settings
    case 'lineage':
      return GitMerge
    case 'log':
      return FileText
    default:
      return Columns
  }
}

function sourceIcon(type: string): Component {
  const connector = type.toLowerCase()
  if (connector.includes('mongo'))
    return Leaf
  if (connector.includes('kafka') || connector.includes('pulsar'))
    return Activity
  if (connector.includes('bigquery'))
    return Cloud
  if (connector.includes('snowflake') || connector.includes('s3') || connector.includes('file'))
    return HardDrive
  if (connector.includes('sql') || connector.includes('oracle'))
    return Server
  return Database
}

function sourceIconColor(type: string) {
  const connector = type.toLowerCase()
  if (connector.includes('postgres'))
    return 'text-[#336791]'
  if (connector.includes('mongo'))
    return 'text-[#47A248]'
  if (connector.includes('kafka') || connector.includes('pulsar'))
    return 'text-gray-700'
  if (connector.includes('snowflake'))
    return 'text-cyan-600'
  return 'text-gray-600'
}
</script>

<template>
  <section class="flex h-full w-full flex-col overflow-hidden bg-white">
    <header class="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-gray-100/70 px-4 md:px-6">
      <h1 class="min-w-0 truncate text-[15px] font-semibold text-gray-900">
        {{ t('sources.title') }}
      </h1>

      <div class="flex shrink-0 items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-gray-800"
          @click="createOpen = true"
        >
          <Plus class="h-4 w-4" aria-hidden="true" />
          {{ t('sources.actions.create') }}
        </button>
      </div>
    </header>

    <div class="flex min-h-0 flex-1 flex-col bg-white md:flex-row">
      <aside class="flex w-full shrink-0 flex-col border-b border-gray-100/70 bg-[#fcfcfd]/80 md:w-64 md:border-b-0 md:border-r">
        <div class="border-b border-gray-100/70 p-3">
          <label class="relative block">
            <span class="sr-only">{{ t('sources.search.label') }}</span>
            <Search class="absolute left-3 top-2 h-4 w-4 text-gray-400" aria-hidden="true" />
            <input
              v-model="searchText"
              type="search"
              class="w-full rounded-lg border border-gray-200/80 bg-white py-1.5 pl-9 pr-3 text-[13px] outline-none transition focus:border-gray-300 focus:ring-2 focus:ring-gray-900/10"
              :placeholder="t('sources.search.placeholder')"
            >
          </label>

          <el-select
            v-model="connectionStatusFilter"
            class="mt-2 w-full"
            :aria-label="t('sources.filters.connectionStatus.label')"
            :placeholder="t('sources.filters.connectionStatus.label')"
          >
            <template #prefix>
              <ListFilter class="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
            </template>
            <el-option
              v-for="option in connectionStatusOptions"
              :key="option.value"
              :label="t(option.labelKey)"
              :value="option.value"
            />
          </el-select>
        </div>

        <div class="flex min-h-[150px] flex-1 gap-1 overflow-auto p-2 md:flex-col">
          <button
            type="button"
            class="flex min-w-[160px] items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] transition-colors md:min-w-0"
            :class="selectedSource === null ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-50'"
            @click="selectSource(null)"
          >
            <Database class="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
            <span class="truncate">{{ t('sources.allSources') }}</span>
          </button>

          <button
            v-for="source in filteredSources"
            :key="source.id"
            type="button"
            class="flex min-w-[190px] items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] transition-colors md:min-w-0"
            :class="selectedSource?.id === source.id ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-50'"
            @click="selectSource(source)"
          >
            <component :is="sourceIcon(source.type)" class="h-4 w-4 shrink-0" :class="[sourceIconColor(source.type)]" aria-hidden="true" />
            <span class="truncate">{{ source.name }}</span>
            <span class="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" aria-hidden="true" />
          </button>
        </div>
      </aside>

      <main class="flex min-w-0 flex-1 flex-col bg-white">
        <div v-if="loading" class="page-state">
          <LoaderCircle class="h-7 w-7 animate-spin text-gray-300" aria-hidden="true" />
          <div class="page-state__title">
            {{ t('sources.states.loading') }}
          </div>
        </div>

        <div v-else-if="loadError" class="page-state">
          <AlertCircle class="h-8 w-8 text-orange-400" aria-hidden="true" />
          <div class="page-state__title">
            {{ t('state.error.title') }}
          </div>
          <p class="page-state__body">
            {{ loadError }}
          </p>
          <button class="rounded-lg bg-gray-900 px-3 py-1.5 text-[13px] font-medium text-white" type="button" @click="load()">
            {{ t('state.error.retry') }}
          </button>
        </div>

        <template v-else-if="selectedSource && !selectedTable">
          <div class="shrink-0 border-b border-gray-100/70 bg-white px-4 py-4 md:px-6">
            <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div class="flex min-w-0 items-start gap-3">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200/70 bg-gray-50">
                  <component :is="sourceIcon(selectedSource.type)" class="h-5 w-5" :class="[sourceIconColor(selectedSource.type)]" aria-hidden="true" />
                </div>
                <div class="min-w-0">
                  <h2 class="truncate text-base font-semibold text-gray-900">
                    {{ selectedSource.name }}
                  </h2>
                  <div class="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-gray-500">
                    <span class="inline-flex items-center gap-1.5">
                      <Server class="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
                      {{ selectedSource.host }}
                    </span>
                    <span>{{ selectedSource.type }}</span>
                    <span class="inline-flex items-center gap-1.5">
                      <span class="h-1.5 w-1.5 rounded-full bg-gray-300" aria-hidden="true" />
                      {{ t('sources.details.secretConfigured') }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="flex flex-wrap gap-2">
                <button disabled class="cursor-not-allowed rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-400 shadow-sm">
                  {{ t('sources.actions.test') }}
                </button>
                <button disabled class="cursor-not-allowed rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-400 shadow-sm">
                  {{ t('sources.actions.sync') }}
                </button>
              </div>
            </div>
          </div>

          <div class="min-h-0 flex-1 overflow-auto bg-gray-50/40 p-4 md:p-6">
            <h3 class="mb-3 text-[13px] font-semibold text-gray-900">
              {{ t('sources.tablesIn', { name: selectedSource.name }) }}
            </h3>

            <div v-if="selectedSource.tables.length === 0" class="page-state rounded-lg border border-gray-200/70 bg-white">
              <TableIcon class="h-8 w-8 text-gray-300" aria-hidden="true" />
              <div class="page-state__title">
                {{ t('sources.noTablesTitle') }}
              </div>
              <p class="page-state__body">
                {{ t('sources.details.noTables') }}
              </p>
            </div>

            <div v-else class="overflow-hidden rounded-lg border border-gray-200/70 bg-white shadow-sm">
              <div class="overflow-x-auto">
                <table class="w-full min-w-[680px] text-left text-[13px]">
                  <thead class="border-b border-gray-200/70 bg-gray-50/70 text-gray-500">
                    <tr>
                      <th class="px-4 py-2.5 font-medium">
                        {{ t('sources.table.name') }}
                      </th>
                      <th class="px-4 py-2.5 text-right font-medium">
                        {{ t('sources.table.rows') }}
                      </th>
                      <th class="px-4 py-2.5 text-right font-medium">
                        {{ t('sources.table.size') }}
                      </th>
                      <th class="px-4 py-2.5 font-medium">
                        {{ t('sources.table.lastSync') }}
                      </th>
                      <th class="w-10 px-4 py-2.5">
                        <span class="sr-only">{{ t('common.actions') }}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100/70">
                    <tr
                      v-for="table in selectedSource.tables"
                      :key="table.id"
                      class="group cursor-pointer transition-colors hover:bg-gray-50/70"
                      @click="selectTable(table)"
                    >
                      <td class="px-4 py-3">
                        <div class="flex items-center gap-2">
                          <TableIcon class="h-4 w-4 text-gray-400 transition-colors group-hover:text-gray-700" aria-hidden="true" />
                          <span class="font-medium text-gray-900">{{ table.name }}</span>
                        </div>
                      </td>
                      <td class="px-4 py-3 text-right font-mono text-[12px] text-gray-400">
                        {{ table.rows }}
                      </td>
                      <td class="px-4 py-3 text-right font-mono text-[12px] text-gray-400">
                        {{ table.size }}
                      </td>
                      <td class="px-4 py-3 text-gray-400">
                        {{ table.lastSync }}
                      </td>
                      <td class="px-4 py-3 text-right">
                        <ChevronRight class="inline-block h-4 w-4 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </template>

        <template v-else-if="selectedSource && selectedTable">
          <div class="flex h-full min-h-0 flex-col">
            <div class="shrink-0 border-b border-gray-100/70 bg-white px-4 pt-4 md:px-6">
              <div class="flex items-center justify-between gap-3">
                <div class="flex min-w-0 items-center gap-2 text-[13px]">
                  <button class="inline-flex items-center gap-1 font-medium text-gray-500 transition-colors hover:text-gray-900" @click="selectedTable = null">
                    <ArrowLeft class="h-3.5 w-3.5" aria-hidden="true" />
                    <span class="truncate">{{ selectedSource.name }}</span>
                  </button>
                  <span class="text-gray-300">{{ t('common.separator') }}</span>
                  <div class="flex min-w-0 items-center gap-1.5 rounded-md border border-gray-200/70 bg-gray-50 px-2 py-1 font-semibold text-gray-900 shadow-sm">
                    <TableIcon class="h-3.5 w-3.5 shrink-0 text-gray-500" aria-hidden="true" />
                    <span class="truncate">{{ selectedTable.name }}</span>
                  </div>
                </div>
                <button disabled class="cursor-not-allowed rounded-md p-1.5 text-gray-300" :aria-label="t('common.expand')">
                  <Maximize2 class="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div class="mt-4 flex items-center gap-5 overflow-x-auto text-[13px] font-medium">
                <button
                  v-for="tab in tabs"
                  :key="tab.value"
                  type="button"
                  class="relative top-px shrink-0 border-b-2 pb-2.5 transition-colors"
                  :class="activeTab === tab.value ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'"
                  @click="activeTab = tab.value"
                >
                  {{ t(tab.labelKey) }}
                </button>
              </div>
            </div>

            <div class="flex min-h-0 flex-1 flex-col bg-white lg:flex-row">
              <div class="min-w-0 flex-1 overflow-auto">
                <div class="page-state">
                  <component :is="tabIcon(activeTab)" class="h-8 w-8 text-gray-300" aria-hidden="true" />
                  <div class="page-state__title">
                    {{ t('sources.tabComingSoonTitle', { tab: activeTabLabel }) }}
                  </div>
                  <p class="page-state__body">
                    {{ t('sources.tabComingSoonBody') }}
                  </p>
                </div>
              </div>

              <aside class="flex w-full shrink-0 flex-col gap-5 border-t border-gray-100/70 bg-[#fcfcfd]/80 p-5 lg:w-64 lg:border-l lg:border-t-0">
                <div>
                  <div class="mb-4 text-[11px] font-semibold uppercase text-gray-500">
                    {{ t('sources.stats.last24h') }}
                  </div>
                  <div class="space-y-5">
                    <div class="flex items-center justify-between text-[12px] text-gray-500">
                      <span>{{ t('sources.stats.ingestedRows') }}</span>
                      <span class="font-medium text-gray-400">{{ selectedTable.ingestedRows }}</span>
                    </div>
                    <div class="flex items-center justify-between text-[12px] text-gray-500">
                      <span>{{ t('sources.stats.quarantine') }}</span>
                      <span class="font-medium text-gray-400">{{ selectedTable.quarantine }}</span>
                    </div>
                  </div>
                </div>

                <dl class="space-y-3.5 border-t border-gray-200/70 pt-5 text-[12px]">
                  <div class="flex justify-between gap-3">
                    <dt class="text-gray-500">
                      {{ t('sources.stats.size') }}
                    </dt>
                    <dd class="font-medium text-gray-400">
                      {{ selectedTable.size }}
                    </dd>
                  </div>
                  <div class="flex justify-between gap-3">
                    <dt class="text-gray-500">
                      {{ t('sources.stats.rows') }}
                    </dt>
                    <dd class="font-medium text-gray-400">
                      {{ selectedTable.rows }}
                    </dd>
                  </div>
                  <div class="flex justify-between gap-3">
                    <dt class="text-gray-500">
                      {{ t('sources.stats.id') }}
                    </dt>
                    <dd class="max-w-[130px] truncate rounded bg-gray-100 px-1.5 py-0.5 font-mono text-gray-500">
                      {{ selectedTable.id }}
                    </dd>
                  </div>
                  <div class="flex justify-between gap-3">
                    <dt class="text-gray-500">
                      {{ t('sources.stats.lastUpdate') }}
                    </dt>
                    <dd class="text-gray-400">
                      {{ selectedTable.lastSync }}
                    </dd>
                  </div>
                </dl>

                <div class="border-t border-gray-200/70 pt-5">
                  <div class="mb-2 text-[12px] font-medium text-gray-700">
                    {{ t('sources.generatedEndpoint') }}
                  </div>
                  <div class="truncate rounded border border-gray-200 bg-gray-50 p-2 font-mono text-[11px] text-gray-400">
                    {{ selectedTable.endpoint }}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </template>

        <div v-else class="flex min-h-0 flex-1 flex-col bg-gray-50/40">
          <div class="shrink-0 border-b border-gray-100/70 bg-white px-4 py-4 md:px-6">
            <h2 class="text-base font-semibold text-gray-900">
              {{ t('sources.allSources') }}
            </h2>
            <p class="mt-1 text-[13px] text-gray-500">
              {{ t('sources.allSourcesDescription') }}
            </p>
          </div>

          <div class="min-h-0 flex-1 overflow-auto p-4 md:p-6">
            <div v-if="sources.length === 0" class="page-state rounded-lg border border-gray-200/70 bg-white">
              <Database class="h-8 w-8 text-gray-300" aria-hidden="true" />
              <div class="page-state__title">
                {{ t('sources.empty.title') }}
              </div>
              <p class="page-state__body">
                {{ t('sources.empty.body') }}
              </p>
              <button class="rounded-lg bg-gray-900 px-3 py-1.5 text-[13px] font-medium text-white" type="button" @click="createOpen = true">
                {{ t('sources.actions.create') }}
              </button>
            </div>

            <div v-else class="overflow-hidden rounded-lg border border-gray-200/70 bg-white shadow-sm">
              <div class="overflow-x-auto">
                <table class="w-full min-w-[780px] text-left text-[13px]">
                  <thead class="border-b border-gray-200/70 bg-gray-50/70 text-gray-500">
                    <tr>
                      <th class="px-4 py-2.5 font-medium">
                        {{ t('sources.table.sourceName') }}
                      </th>
                      <th class="px-4 py-2.5 font-medium">
                        {{ t('sources.table.type') }}
                      </th>
                      <th class="px-4 py-2.5 font-medium">
                        {{ t('sources.table.status') }}
                      </th>
                      <th class="px-4 py-2.5 font-medium">
                        {{ t('sources.table.host') }}
                      </th>
                      <th class="px-4 py-2.5 font-medium">
                        {{ t('sources.table.tables') }}
                      </th>
                      <th class="w-10 px-4 py-2.5">
                        <span class="sr-only">{{ t('common.actions') }}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100/70">
                    <tr v-if="filteredSources.length === 0">
                      <td colspan="6" class="px-4 py-10 text-center text-[13px] text-gray-500">
                        {{ t('sources.filters.noResults') }}
                      </td>
                    </tr>
                    <tr
                      v-for="source in filteredSources"
                      :key="source.id"
                      class="group cursor-pointer transition-colors hover:bg-gray-50/70"
                      @click="selectSource(source)"
                    >
                      <td class="px-4 py-3">
                        <div class="flex items-center gap-2.5">
                          <div class="flex h-6 w-6 items-center justify-center rounded-lg border border-gray-200/70 bg-gray-50">
                            <component :is="sourceIcon(source.type)" class="h-3.5 w-3.5" :class="[sourceIconColor(source.type)]" aria-hidden="true" />
                          </div>
                          <span class="font-medium text-gray-900">{{ source.name }}</span>
                        </div>
                      </td>
                      <td class="px-4 py-3 text-gray-600">
                        {{ source.type }}
                      </td>
                      <td class="px-4 py-3">
                        <span class="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 px-1.5 py-0.5 text-[11px] font-medium text-gray-600 ring-1 ring-inset ring-gray-600/15">
                          <span class="h-1 w-1 rounded-full bg-gray-400" aria-hidden="true" />
                          {{ t('sources.details.secretConfigured') }}
                        </span>
                      </td>
                      <td class="px-4 py-3 text-gray-500">
                        {{ source.host }}
                      </td>
                      <td class="px-4 py-3 text-gray-600">
                        {{ t('sources.tablesCount', { count: source.tables.length }) }}
                      </td>
                      <td class="px-4 py-3 text-right">
                        <MoreHorizontal class="inline-block h-4 w-4 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>

    <SourceCreateDialog v-model="createOpen" @created="onCreated" />
  </section>
</template>
