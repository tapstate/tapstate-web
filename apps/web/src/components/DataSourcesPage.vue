<script setup lang="ts">
import type { Component } from 'vue'
import type { JsonValue, SourceTableView, SourceView } from '@/services/sourceClient'
import { ElMessage } from 'element-plus'
import {
  Activity,
  AlertCircle,
  Braces,
  ChevronRight,
  Cloud,
  Database,
  FileText,
  HardDrive,
  KeyRound,
  Leaf,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  Server,
  Table2,
} from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { listSources, SourceClientError } from '@/services/sourceClient'
import { useAuthStore } from '@/stores/auth'
import SourceCreateDialog from './SourceCreateDialog.vue'

const { t } = useI18n()
const auth = useAuthStore()
const sources = ref<SourceView[]>([])
const selectedId = ref<string | null>(null)
const searchText = ref('')
const loading = ref(true)
const loadError = ref('')
const createOpen = ref(false)

const filteredSources = computed(() => {
  const query = searchText.value.trim().toLowerCase()
  if (!query)
    return sources.value

  return sources.value.filter(source =>
    source.id.toLowerCase().includes(query)
    || source.connector.toLowerCase().includes(query)
    || sourceEndpoint(source).toLowerCase().includes(query),
  )
})

const selectedSource = computed(() =>
  sources.value.find(source => source.id === selectedId.value) ?? null,
)

const configuredValues = computed(() => {
  if (selectedSource.value === null)
    return []
  return Object.entries(selectedSource.value.config)
})

onMounted(load)

async function load(preferredId?: string) {
  loading.value = true
  loadError.value = ''
  try {
    sources.value = await listSources(auth.apiFetch)
    const nextId = preferredId ?? selectedId.value
    selectedId.value = sources.value.some(source => source.id === nextId)
      ? nextId
      : sources.value[0]?.id ?? null
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

function onCreated(source: SourceView) {
  sources.value = [...sources.value.filter(item => item.id !== source.id), source]
    .sort((left, right) => left.id.localeCompare(right.id))
  selectedId.value = source.id
  ElMessage.success(t('sources.create.success', { id: source.id }))
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

function sourceIcon(connector: string): Component {
  const id = connector.toLowerCase()
  if (id.includes('mongo'))
    return Leaf
  if (id.includes('kafka') || id.includes('pulsar'))
    return Activity
  if (id.includes('snowflake') || id.includes('bigquery'))
    return Cloud
  if (id.includes('file') || id.includes('s3'))
    return HardDrive
  if (id.includes('sql') || id.includes('oracle'))
    return Server
  return Database
}

function displayValue(value: JsonValue) {
  if (typeof value === 'object' && value !== null)
    return JSON.stringify(value)
  return String(value)
}

function tableLabel(table: SourceTableView) {
  return table.name ?? table.pattern ?? table.filter ?? t('sources.details.unnamedTable')
}
</script>

<template>
  <section class="sources-page">
    <header class="sources-page__header">
      <div>
        <h1>{{ t('sources.title') }}</h1>
        <p>{{ t('sources.subtitle') }}</p>
      </div>
      <button class="sources-page__primary" type="button" @click="createOpen = true">
        <Plus :size="15" />
        {{ t('sources.actions.create') }}
      </button>
    </header>

    <div class="sources-page__toolbar">
      <label class="sources-page__search">
        <Search :size="15" aria-hidden="true" />
        <input
          v-model="searchText"
          type="search"
          :aria-label="t('sources.search.label')"
          :placeholder="t('sources.search.placeholder')"
        >
      </label>
      <button class="sources-page__icon-button" type="button" :aria-label="t('sources.actions.refresh')" @click="load()">
        <RefreshCw :size="15" :class="{ 'animate-spin': loading }" />
      </button>
    </div>

    <div v-if="loading && sources.length === 0" class="sources-page__state">
      <LoaderCircle class="animate-spin" :size="20" />
      <span>{{ t('sources.states.loading') }}</span>
    </div>

    <div v-else-if="loadError" class="sources-page__state sources-page__state--error">
      <AlertCircle :size="20" />
      <strong>{{ t('state.error.title') }}</strong>
      <span>{{ loadError }}</span>
      <button type="button" @click="load()">
        {{ t('state.error.retry') }}
      </button>
    </div>

    <div v-else-if="sources.length === 0" class="sources-page__state">
      <span class="sources-page__empty-icon">
        <Database :size="21" />
      </span>
      <strong>{{ t('sources.empty.title') }}</strong>
      <span>{{ t('sources.empty.body') }}</span>
      <button type="button" @click="createOpen = true">
        {{ t('sources.actions.create') }}
      </button>
    </div>

    <div v-else class="sources-page__workspace">
      <aside class="sources-page__rail">
        <div class="sources-page__rail-label">
          <span>{{ t('sources.allSources') }}</span>
          <small>{{ filteredSources.length }}</small>
        </div>
        <div v-if="filteredSources.length === 0" class="sources-page__no-results">
          {{ t('sources.filters.noResults') }}
        </div>
        <button
          v-for="source in filteredSources"
          :key="source.id"
          class="source-row"
          :class="{ 'source-row--active': selectedId === source.id }"
          type="button"
          @click="selectedId = source.id"
        >
          <span class="source-row__icon">
            <component :is="sourceIcon(source.connector)" :size="17" />
          </span>
          <span class="source-row__copy">
            <strong>{{ source.id }}</strong>
            <small>{{ source.connector }}</small>
          </span>
          <ChevronRight :size="15" class="source-row__chevron" />
        </button>
      </aside>

      <main v-if="selectedSource" class="source-detail">
        <header class="source-detail__header">
          <div class="source-detail__identity">
            <span class="source-detail__mark">
              <component :is="sourceIcon(selectedSource.connector)" :size="22" />
            </span>
            <div>
              <div class="source-detail__eyebrow">
                {{ selectedSource.connector }}
              </div>
              <h2>{{ selectedSource.id }}</h2>
              <p>{{ sourceEndpoint(selectedSource) }}</p>
            </div>
          </div>
          <span class="source-detail__hash">{{ selectedSource.contentHash.slice(0, 10) }}</span>
        </header>

        <div class="source-detail__facts">
          <div>
            <span>{{ t('sources.details.mode') }}</span>
            <strong>{{ selectedSource.mode ?? t('sources.details.connectionOnly') }}</strong>
          </div>
          <div>
            <span>{{ t('sources.details.tables') }}</span>
            <strong>{{ selectedSource.tables?.length ?? 0 }}</strong>
          </div>
          <div>
            <span>{{ t('sources.details.configuredFields') }}</span>
            <strong>{{ configuredValues.length + selectedSource.configuredSecrets.length }}</strong>
          </div>
        </div>

        <div class="source-detail__content">
          <section class="source-detail__section">
            <div class="source-detail__section-title">
              <Braces :size="16" />
              <h3>{{ t('sources.details.configuration') }}</h3>
            </div>
            <dl v-if="configuredValues.length > 0" class="source-config-list">
              <div v-for="([name, value]) in configuredValues" :key="name">
                <dt>{{ name }}</dt>
                <dd>{{ displayValue(value) }}</dd>
              </div>
            </dl>
            <p v-else class="source-detail__muted">
              {{ t('sources.details.noConfiguration') }}
            </p>

            <div v-if="selectedSource.configuredSecrets.length > 0" class="source-secret-list">
              <div v-for="secret in selectedSource.configuredSecrets" :key="secret">
                <KeyRound :size="13" />
                <span>{{ secret }}</span>
                <small>{{ t('sources.details.secretConfigured') }}</small>
              </div>
            </div>
          </section>

          <section class="source-detail__section">
            <div class="source-detail__section-title">
              <Table2 :size="16" />
              <h3>{{ t('sources.details.tableSelection') }}</h3>
            </div>
            <div v-if="selectedSource.tables?.length" class="source-table-list">
              <div v-for="(table, index) in selectedSource.tables" :key="`${tableLabel(table)}-${index}`">
                <FileText :size="14" />
                <span>{{ tableLabel(table) }}</span>
                <small>{{ table.type }}</small>
              </div>
            </div>
            <p v-else class="source-detail__muted">
              {{ t('sources.details.noTables') }}
            </p>
          </section>
        </div>
      </main>
    </div>

    <SourceCreateDialog v-model="createOpen" @created="onCreated" />
  </section>
</template>

<style scoped>
.sources-page {
  display: flex;
  min-width: 0;
  min-height: 0;
  width: 100%;
  flex: 1;
  flex-direction: column;
  color: #262626;
  background: #fff;
}

.sources-page__header,
.sources-page__toolbar,
.source-detail__header,
.source-detail__facts,
.source-detail__identity,
.source-detail__section-title,
.source-secret-list div,
.source-table-list div {
  display: flex;
  align-items: center;
}

.sources-page__header {
  min-height: 76px;
  justify-content: space-between;
  gap: 24px;
  padding: 16px 22px;
  border-bottom: 1px solid #ededed;
}

.sources-page__header h1,
.source-detail__header h2,
.source-detail__section h3 {
  margin: 0;
  letter-spacing: 0;
}

.sources-page__header h1 {
  color: #171717;
  font-size: 16px;
  font-weight: 650;
}

.sources-page__header p {
  margin: 4px 0 0;
  color: #8a8a8a;
  font-size: 12px;
}

.sources-page__primary,
.sources-page__icon-button,
.sources-page__state button {
  border: 0;
  cursor: pointer;
}

.sources-page__primary {
  display: inline-flex;
  min-height: 34px;
  flex-shrink: 0;
  align-items: center;
  gap: 7px;
  padding: 0 13px;
  border-radius: 6px;
  color: #fff;
  background: #202020;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  box-shadow: 0 1px 2px rgb(0 0 0 / 14%);
  transition: background 160ms ease, transform 160ms ease;
}

.sources-page__primary:hover {
  background: #0f0f0f;
  transform: translateY(-1px);
}

.sources-page__toolbar {
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid #ededed;
  background: #fcfcfc;
}

.sources-page__search {
  position: relative;
  display: flex;
  max-width: 340px;
  flex: 1;
  align-items: center;
}

.sources-page__search svg {
  position: absolute;
  left: 10px;
  color: #a3a3a3;
}

.sources-page__search input {
  width: 100%;
  height: 32px;
  padding: 0 10px 0 32px;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  outline: none;
  color: #262626;
  background: #fff;
  font-size: 12px;
}

.sources-page__search input:focus {
  border-color: #b8b8b8;
  box-shadow: 0 0 0 3px rgb(23 23 23 / 5%);
}

.sources-page__icon-button {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  color: #737373;
  background: #fff;
}

.sources-page__workspace {
  display: grid;
  min-height: 0;
  flex: 1;
  grid-template-columns: 248px minmax(0, 1fr);
}

.sources-page__rail {
  min-height: 0;
  overflow-y: auto;
  border-right: 1px solid #ededed;
  background: #fafafa;
}

.sources-page__rail-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 15px 9px;
  color: #8a8a8a;
  font-size: 10px;
  font-weight: 650;
  text-transform: uppercase;
}

.sources-page__rail-label small {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.source-row {
  display: flex;
  width: calc(100% - 12px);
  min-height: 52px;
  align-items: center;
  gap: 10px;
  margin: 2px 6px;
  padding: 7px 8px;
  border: 0;
  border-radius: 6px;
  color: #404040;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.source-row:hover,
.source-row--active {
  background: #fff;
}

.source-row--active {
  box-shadow: 0 0 0 1px #e6e6e6, 0 1px 2px rgb(0 0 0 / 4%);
}

.source-row__icon,
.source-detail__mark,
.sources-page__empty-icon {
  display: grid;
  place-items: center;
  border: 1px solid #e5e5e5;
  color: #525252;
  background: #fff;
}

.source-row__icon {
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  border-radius: 6px;
}

.source-row__copy {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 3px;
}

.source-row__copy strong,
.source-row__copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-row__copy strong {
  color: #262626;
  font-size: 12px;
  font-weight: 600;
}

.source-row__copy small {
  color: #a3a3a3;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 10px;
}

.source-row__chevron {
  color: #c4c4c4;
}

.source-detail {
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
}

.source-detail__header {
  justify-content: space-between;
  gap: 20px;
  padding: 26px 30px 22px;
}

.source-detail__identity {
  min-width: 0;
  gap: 14px;
}

.source-detail__mark {
  width: 46px;
  height: 46px;
  flex: 0 0 46px;
  border-radius: 8px;
  background: #fafafa;
}

.source-detail__eyebrow {
  margin-bottom: 3px;
  color: #8a8a8a;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 10px;
  text-transform: uppercase;
}

.source-detail__header h2 {
  color: #171717;
  font-size: 20px;
  font-weight: 650;
}

.source-detail__header p {
  margin: 5px 0 0;
  overflow: hidden;
  color: #737373;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-detail__hash {
  flex-shrink: 0;
  padding: 5px 7px;
  border: 1px solid #e5e5e5;
  border-radius: 4px;
  color: #8a8a8a;
  background: #fafafa;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 9px;
}

.source-detail__facts {
  border-top: 1px solid #ededed;
  border-bottom: 1px solid #ededed;
  background: #fcfcfc;
}

.source-detail__facts > div {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 5px;
  padding: 14px 20px;
  border-right: 1px solid #ededed;
}

.source-detail__facts > div:last-child {
  border-right: 0;
}

.source-detail__facts span {
  color: #8a8a8a;
  font-size: 10px;
}

.source-detail__facts strong {
  overflow: hidden;
  color: #262626;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  font-weight: 550;
  text-overflow: ellipsis;
}

.source-detail__content {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(260px, .85fr);
}

.source-detail__section {
  min-width: 0;
  padding: 24px 28px;
}

.source-detail__section + .source-detail__section {
  border-left: 1px solid #ededed;
}

.source-detail__section-title {
  gap: 8px;
  margin-bottom: 15px;
  color: #737373;
}

.source-detail__section h3 {
  color: #404040;
  font-size: 12px;
  font-weight: 650;
}

.source-config-list {
  margin: 0;
}

.source-config-list > div {
  display: grid;
  grid-template-columns: minmax(90px, .65fr) minmax(0, 1.35fr);
  gap: 16px;
  padding: 9px 0;
  border-bottom: 1px solid #f0f0f0;
}

.source-config-list dt,
.source-config-list dd {
  margin: 0;
  font-size: 11px;
}

.source-config-list dt {
  color: #8a8a8a;
}

.source-config-list dd {
  overflow-wrap: anywhere;
  color: #404040;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  text-align: right;
}

.source-secret-list,
.source-table-list {
  display: grid;
  gap: 6px;
  margin-top: 14px;
}

.source-secret-list div,
.source-table-list div {
  min-height: 34px;
  gap: 8px;
  padding: 0 9px;
  border: 1px solid #ededed;
  border-radius: 5px;
  color: #737373;
  background: #fcfcfc;
  font-size: 11px;
}

.source-secret-list span,
.source-table-list span {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  color: #404040;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-secret-list small,
.source-table-list small {
  color: #a3a3a3;
  font-size: 9px;
  text-transform: uppercase;
}

.source-detail__muted,
.sources-page__no-results {
  color: #a3a3a3;
  font-size: 12px;
}

.sources-page__no-results {
  padding: 24px 16px;
  text-align: center;
}

.sources-page__state {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 32px;
  color: #8a8a8a;
  text-align: center;
  font-size: 12px;
}

.sources-page__state strong {
  color: #404040;
  font-size: 14px;
}

.sources-page__state button {
  margin-top: 4px;
  padding: 7px 11px;
  border-radius: 5px;
  color: #fff;
  background: #262626;
  font-size: 11px;
}

.sources-page__state--error svg {
  color: #c2410c;
}

.sources-page__empty-icon {
  width: 42px;
  height: 42px;
  margin-bottom: 3px;
  border-radius: 8px;
}

@media (max-width: 900px) {
  .sources-page__workspace {
    grid-template-columns: 210px minmax(0, 1fr);
  }

  .source-detail__content {
    grid-template-columns: 1fr;
  }

  .source-detail__section + .source-detail__section {
    border-top: 1px solid #ededed;
    border-left: 0;
  }
}

@media (max-width: 680px) {
  .sources-page__workspace {
    display: flex;
    flex-direction: column;
  }

  .sources-page__rail {
    max-height: 210px;
    border-right: 0;
    border-bottom: 1px solid #ededed;
  }

  .source-detail__header {
    padding: 20px;
  }

  .source-detail__facts {
    align-items: stretch;
  }

  .source-detail__facts > div {
    padding: 11px;
  }

  .source-detail__section {
    padding: 20px;
  }
}
</style>
