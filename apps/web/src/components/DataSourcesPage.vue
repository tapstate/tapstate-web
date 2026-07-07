<script setup lang="ts">
import type { Component } from 'vue'
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Cloud,
  Columns,
  Database,
  FileText,
  GitMerge,
  HardDrive,
  Leaf,
  Maximize2,
  MoreHorizontal,
  Plus,
  Search,
  Server,
  Settings,
  Table as TableIcon,
} from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

type SourceStatus = 'connected' | 'error'
type SourceType = 'postgres' | 'kafka' | 'mssql' | 'mongodb' | 'snowflake' | 'bigquery'
type SourceTab = 'data' | 'columns' | 'settings' | 'lineage' | 'log'

interface SourceTable {
  id: string
  name: string
  rows: string
  size: string
  lastSync: string
  ingestedRows: string
  quarantine: string
  endpoint: string
}

interface Source {
  id: string
  name: string
  type: SourceType
  status: SourceStatus
  host: string
  tables: SourceTable[]
}

interface ColumnDefinition {
  name: string
  type: string
}

interface PreviewRow {
  id: string
  index: number
  values: Record<string, string>
}

const { t } = useI18n()
const searchText = ref('')
const activeTab = ref<SourceTab>('data')
const selectedSource = ref<Source | null>(null)
const selectedTable = ref<SourceTable | null>(null)

const tabs: Array<{ value: SourceTab, labelKey: string }> = [
  { value: 'data', labelKey: 'sources.tabs.data' },
  { value: 'columns', labelKey: 'sources.tabs.columns' },
  { value: 'settings', labelKey: 'sources.tabs.settings' },
  { value: 'lineage', labelKey: 'sources.tabs.lineage' },
  { value: 'log', labelKey: 'sources.tabs.log' },
]

const mockSources: Source[] = [
  {
    id: 'src_production_db',
    name: 'production_db',
    type: 'postgres',
    status: 'connected',
    host: 'db.prod.internal',
    tables: [
      { id: 'users', name: 'users', rows: '1.2m', size: '245 MB', lastSync: '10 mins ago', ingestedRows: '32k', quarantine: '0', endpoint: 'https://api.cyntex.dev/v1/t/users' },
      { id: 'orders', name: 'orders', rows: '5.4m', size: '1.2 GB', lastSync: '12 mins ago', ingestedRows: '46k', quarantine: '0', endpoint: 'https://api.cyntex.dev/v1/t/orders' },
      { id: 'products', name: 'products', rows: '45k', size: '12 MB', lastSync: '1 hour ago', ingestedRows: '11k', quarantine: '0', endpoint: 'https://api.cyntex.dev/v1/t/products' },
    ],
  },
  {
    id: 'src_analytics_events',
    name: 'analytics_events',
    type: 'kafka',
    status: 'connected',
    host: 'kafka.prod.internal',
    tables: [
      { id: 'page_views', name: 'page_views', rows: '222m', size: '3.9 GB', lastSync: 'Just now', ingestedRows: '58k', quarantine: '0', endpoint: 'https://api.cyntex.dev/v1/t/page_views' },
      { id: 'button_clicks', name: 'button_clicks', rows: '89m', size: '1.1 GB', lastSync: 'Just now', ingestedRows: '21k', quarantine: '0', endpoint: 'https://api.cyntex.dev/v1/t/button_clicks' },
    ],
  },
  {
    id: 'src_crm_data',
    name: 'crm_data',
    type: 'mssql',
    status: 'connected',
    host: 'crm-sql-01',
    tables: [
      { id: 'customers', name: 'customers', rows: '314k', size: '90.6 MB', lastSync: '1 day ago', ingestedRows: '14k', quarantine: '0', endpoint: 'https://api.cyntex.dev/v1/t/customers' },
      { id: 'leads', name: 'leads', rows: '1.2m', size: '400 MB', lastSync: '5 hours ago', ingestedRows: '19k', quarantine: '0', endpoint: 'https://api.cyntex.dev/v1/t/leads' },
    ],
  },
  { id: 'src_legacy_mongodb', name: 'legacy_mongodb', type: 'mongodb', status: 'error', host: 'mongo-cluster-old', tables: [] },
  { id: 'src_data_warehouse', name: 'data_warehouse', type: 'snowflake', status: 'connected', host: 'xy12345.snowflakecomputing.com', tables: [] },
]

const tableColumns: ColumnDefinition[] = [
  { name: 'id', type: 'UUID' },
  { name: 'created_at', type: 'DateTime64(6)' },
  { name: 'user_id', type: 'Int64' },
  { name: 'event_type', type: 'String' },
  { name: 'properties', type: 'JSON' },
  { name: 'session_id', type: 'String' },
  { name: 'ip_address', type: 'IPv4' },
  { name: 'user_agent', type: 'String' },
]

const previewRows: PreviewRow[] = Array.from({ length: 15 }, (_, index) => {
  const rowIndex = index + 1
  return {
    id: `row-${rowIndex}`,
    index: rowIndex,
    values: {
      id: `evt_${String(rowIndex).padStart(4, '0')}`,
      created_at: `2026-07-05 10:${String(rowIndex * 3).padStart(2, '0')}:00`,
      user_id: `${12000 + rowIndex * 17}`,
      event_type: ['page_view', 'click', 'signup', 'purchase'][index % 4],
      properties: '{"source":"web","version":"2.0"}',
      session_id: `sess_${String(3000 + rowIndex)}`,
      ip_address: `192.168.${rowIndex}.${rowIndex * 7}`,
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)',
    },
  }
})

const activityBars = [28, 44, 36, 62, 48, 78, 54, 88, 65, 72, 58, 92, 76, 63, 84]

const filteredSources = computed(() => {
  const query = searchText.value.trim().toLowerCase()
  if (!query)
    return mockSources
  return mockSources.filter(source =>
    source.name.toLowerCase().includes(query)
    || source.type.includes(query)
    || source.host.toLowerCase().includes(query),
  )
})

const activeTabLabel = computed(() => t(tabs.find(tab => tab.value === activeTab.value)?.labelKey ?? 'sources.tabs.data'))

function selectSource(source: Source | null) {
  selectedSource.value = source
  selectedTable.value = null
  activeTab.value = 'data'
}

function selectTable(table: SourceTable) {
  selectedTable.value = table
  activeTab.value = 'data'
}

function statusLabelKey(status: SourceStatus) {
  return status === 'connected' ? 'sources.status.connected' : 'sources.status.error'
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

function sourceIcon(type: SourceType): Component {
  switch (type) {
    case 'mssql':
      return Server
    case 'mongodb':
      return Leaf
    case 'kafka':
      return Activity
    case 'bigquery':
      return Cloud
    case 'snowflake':
      return HardDrive
    default:
      return Database
  }
}

function sourceIconColor(type: SourceType) {
  switch (type) {
    case 'postgres':
      return 'text-[#336791]'
    case 'mssql':
      return 'text-[#CC292B]'
    case 'mongodb':
      return 'text-[#47A248]'
    case 'kafka':
      return 'text-purple-600'
    case 'bigquery':
      return 'text-blue-500'
    case 'snowflake':
      return 'text-cyan-500'
    default:
      return 'text-gray-600'
  }
}
</script>

<template>
  <section class="flex h-full w-full flex-col overflow-hidden bg-white">
    <header class="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-gray-100/70 px-4 md:px-6">
      <h1 class="min-w-0 truncate text-[15px] font-semibold text-gray-900">
        {{ t('sources.title') }}
      </h1>

      <div class="flex shrink-0 items-center gap-2">
        <button class="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-gray-900 px-3 py-1.5 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-gray-800">
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
              class="w-full rounded-[var(--radius-sm)] border border-gray-200/80 bg-white py-1.5 pl-9 pr-3 text-[13px] outline-none transition focus:border-gray-300 focus:ring-2 focus:ring-gray-900/10"
              :placeholder="t('sources.search.placeholder')"
            >
          </label>
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
            <span
              class="ml-auto h-1.5 w-1.5 shrink-0 rounded-full"
              :class="source.status === 'connected' ? 'bg-green-500' : 'bg-red-500'"
              aria-hidden="true"
            />
          </button>
        </div>
      </aside>

      <main class="flex min-w-0 flex-1 flex-col bg-white">
        <template v-if="selectedSource && !selectedTable">
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
                    <span class="capitalize">{{ selectedSource.type }}</span>
                    <span class="inline-flex items-center gap-1.5">
                      <CheckCircle2 v-if="selectedSource.status === 'connected'" class="h-3.5 w-3.5 text-green-500" aria-hidden="true" />
                      <AlertCircle v-else class="h-3.5 w-3.5 text-red-500" aria-hidden="true" />
                      {{ t(statusLabelKey(selectedSource.status)) }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="flex flex-wrap gap-2">
                <button class="rounded-[var(--radius-sm)] border border-gray-200 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-700 shadow-sm hover:bg-gray-50">
                  {{ t('sources.actions.test') }}
                </button>
                <button class="rounded-[var(--radius-sm)] border border-gray-200 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-700 shadow-sm hover:bg-gray-50">
                  {{ t('sources.actions.sync') }}
                </button>
              </div>
            </div>

            <div v-if="selectedSource.status === 'error'" class="mt-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[13px] text-red-700">
              {{ t('sources.connectionError') }}
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
                {{ t('sources.noTablesBody') }}
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
                          <TableIcon class="h-4 w-4 text-gray-400 transition-colors group-hover:text-indigo-500" aria-hidden="true" />
                          <span class="font-medium text-gray-900">{{ table.name }}</span>
                        </div>
                      </td>
                      <td class="px-4 py-3 text-right font-mono text-[12px] text-gray-600">
                        {{ table.rows }}
                      </td>
                      <td class="px-4 py-3 text-right font-mono text-[12px] text-gray-600">
                        {{ table.size }}
                      </td>
                      <td class="px-4 py-3 text-gray-500">
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
                    <TableIcon class="h-3.5 w-3.5 shrink-0 text-indigo-500" aria-hidden="true" />
                    <span class="truncate">{{ selectedTable.name }}</span>
                  </div>
                </div>
                <button class="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900" :aria-label="t('common.expand')">
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
                <div v-if="activeTab === 'data'" class="min-w-max">
                  <table class="w-full text-left text-[12px]">
                    <thead class="sticky top-0 z-10 border-b border-gray-200/70 bg-white shadow-sm">
                      <tr>
                        <th class="w-16 border-r border-gray-100/70 px-4 py-2 text-center font-medium text-gray-900">
                          {{ t('sources.table.rowNumber') }}
                        </th>
                        <th v-for="column in tableColumns" :key="column.name" class="border-r border-gray-100/70 bg-gray-50/70 px-4 py-2">
                          <div class="font-medium text-gray-900">
                            {{ column.name }}
                          </div>
                          <div class="mt-0.5 font-normal text-gray-500">
                            {{ column.type }}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100/70 font-mono text-gray-600">
                      <tr v-for="row in previewRows" :key="row.id" class="hover:bg-gray-50/70">
                        <td class="border-r border-gray-100/70 px-4 py-2 text-center text-gray-400">
                          {{ row.index }}
                        </td>
                        <td v-for="column in tableColumns" :key="column.name" class="max-w-[220px] truncate border-r border-gray-100/70 px-4 py-2">
                          {{ row.values[column.name] }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div v-else-if="activeTab === 'columns'" class="p-4 md:p-6">
                  <div class="overflow-hidden rounded-lg border border-gray-200/70 shadow-sm">
                    <table class="w-full min-w-[560px] text-left text-[13px]">
                      <thead class="border-b border-gray-200/70 bg-gray-50/70 text-gray-500">
                        <tr>
                          <th class="px-4 py-2.5 font-medium">
                            {{ t('sources.columns.name') }}
                          </th>
                          <th class="px-4 py-2.5 font-medium">
                            {{ t('sources.columns.type') }}
                          </th>
                          <th class="px-4 py-2.5 font-medium">
                            {{ t('sources.columns.position') }}
                          </th>
                          <th class="px-4 py-2.5 font-medium">
                            {{ t('sources.columns.comment') }}
                          </th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-gray-100/70">
                        <tr v-for="(column, index) in tableColumns" :key="column.name" class="hover:bg-gray-50/70">
                          <td class="px-4 py-3 font-medium text-gray-900">
                            {{ column.name }}
                          </td>
                          <td class="bg-gray-50/50 px-4 py-3 font-mono text-[12px] text-gray-600">
                            {{ column.type }}
                          </td>
                          <td class="px-4 py-3 text-gray-500">
                            {{ index + 1 }}
                          </td>
                          <td class="px-4 py-3 text-[12px] italic text-gray-400">
                            {{ t('sources.columns.noComment') }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div v-else class="page-state">
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
                    <div>
                      <div class="flex items-center justify-between text-[12px] text-gray-500">
                        <span>{{ t('sources.stats.ingestedRows') }}</span>
                        <span class="font-medium text-gray-900">{{ selectedTable.ingestedRows }}</span>
                      </div>
                      <div class="mt-2 flex h-8 items-end gap-1">
                        <div
                          v-for="bar in activityBars"
                          :key="bar"
                          class="w-full rounded-t-sm bg-blue-100 transition-colors hover:bg-blue-200"
                          :style="{ height: `${bar}%` }"
                        />
                      </div>
                    </div>

                    <div>
                      <div class="flex items-center justify-between text-[12px] text-gray-500">
                        <span>{{ t('sources.stats.quarantine') }}</span>
                        <span class="font-medium text-gray-900">{{ selectedTable.quarantine }}</span>
                      </div>
                      <div class="mt-2 flex h-8 items-end gap-1">
                        <div v-for="bar in activityBars" :key="`q-${bar}`" class="h-[10%] w-full rounded-t-sm bg-gray-100" />
                      </div>
                    </div>
                  </div>
                </div>

                <dl class="space-y-3.5 border-t border-gray-200/70 pt-5 text-[12px]">
                  <div class="flex justify-between gap-3">
                    <dt class="text-gray-500">
                      {{ t('sources.stats.size') }}
                    </dt>
                    <dd class="font-medium text-gray-900">
                      {{ selectedTable.size }}
                    </dd>
                  </div>
                  <div class="flex justify-between gap-3">
                    <dt class="text-gray-500">
                      {{ t('sources.stats.rows') }}
                    </dt>
                    <dd class="font-medium text-gray-900">
                      {{ selectedTable.rows }}
                    </dd>
                  </div>
                  <div class="flex justify-between gap-3">
                    <dt class="text-gray-500">
                      {{ t('sources.stats.id') }}
                    </dt>
                    <dd class="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-gray-500">
                      {{ selectedTable.id }}
                    </dd>
                  </div>
                  <div class="flex justify-between gap-3">
                    <dt class="text-gray-500">
                      {{ t('sources.stats.lastUpdate') }}
                    </dt>
                    <dd class="max-w-[120px] truncate text-right text-gray-900">
                      {{ selectedTable.lastSync }}
                    </dd>
                  </div>
                </dl>

                <div class="border-t border-gray-200/70 pt-5">
                  <div class="mb-2 text-[12px] font-medium text-gray-700">
                    {{ t('sources.generatedEndpoint') }}
                  </div>
                  <div class="truncate rounded border border-blue-100 bg-blue-50 p-2 font-mono text-[11px] text-blue-700">
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
            <div class="overflow-hidden rounded-lg border border-gray-200/70 bg-white shadow-sm">
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
                    <tr
                      v-for="source in filteredSources"
                      :key="source.id"
                      class="group cursor-pointer transition-colors hover:bg-gray-50/70"
                      @click="selectSource(source)"
                    >
                      <td class="px-4 py-3">
                        <div class="flex items-center gap-2.5">
                          <div class="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] border border-gray-200/70 bg-gray-50">
                            <component :is="sourceIcon(source.type)" class="h-3.5 w-3.5" :class="[sourceIconColor(source.type)]" aria-hidden="true" />
                          </div>
                          <span class="font-medium text-gray-900">{{ source.name }}</span>
                        </div>
                      </td>
                      <td class="px-4 py-3 capitalize text-gray-600">
                        {{ source.type }}
                      </td>
                      <td class="px-4 py-3">
                        <span
                          class="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset"
                          :class="source.status === 'connected'
                            ? 'bg-green-50 text-green-700 ring-green-600/20'
                            : 'bg-red-50 text-red-700 ring-red-600/20'"
                        >
                          <span class="h-1 w-1 rounded-full" :class="source.status === 'connected' ? 'bg-green-500' : 'bg-red-500'" aria-hidden="true" />
                          {{ t(statusLabelKey(source.status)) }}
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
  </section>
</template>
