<script setup lang="ts">
import type {
  ConnectorConfigField,
  ConnectorDetail,
  ConnectorSummary,
  JsonValue,
  SourceView,
} from '@/services/sourceClient'
import { AlertCircle, Check, Database, LoaderCircle } from 'lucide-vue-next'
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  createSource,
  getConnector,
  listConnectors,
  SourceClientError,
} from '@/services/sourceClient'
import { useAuthStore } from '@/stores/auth'
import {
  buildSourceConfig,
  createInitialConfig,
  isFieldVisible,
} from './sourceForm'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'created': [source: SourceView]
}>()

const { t } = useI18n()
const auth = useAuthStore()
const connectors = ref<ConnectorSummary[]>([])
const connector = ref<ConnectorDetail | null>(null)
const sourceId = ref('')
const connectorId = ref('')
const sourceMode = ref('')
const config = reactive<Record<string, JsonValue | undefined>>({})
const fieldErrors = reactive<Record<string, string>>({})
const loadingConnectors = ref(false)
const loadingConnector = ref(false)
const submitting = ref(false)
const requestError = ref('')

const open = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

const visibleFields = computed(() =>
  connector.value?.config.filter(field => isFieldVisible(field, config)) ?? [],
)

watch(() => props.modelValue, async (visible) => {
  if (!visible)
    return
  resetForm()
  if (connectors.value.length === 0)
    await loadConnectors()
})

watch(connectorId, async (id) => {
  connector.value = null
  sourceMode.value = ''
  clearObject(config)
  clearObject(fieldErrors)
  requestError.value = ''
  if (!id)
    return

  loadingConnector.value = true
  try {
    const detail = await getConnector(id, auth.apiFetch)
    connector.value = detail
    Object.assign(config, createInitialConfig(detail.config))
    sourceMode.value = detail.modes[0] ?? ''
  }
  catch (error) {
    requestError.value = errorMessage(error)
  }
  finally {
    loadingConnector.value = false
  }
})

function clearObject(object: Record<string, unknown>) {
  for (const key of Object.keys(object))
    delete object[key]
}

function resetForm() {
  sourceId.value = ''
  connectorId.value = ''
  sourceMode.value = ''
  connector.value = null
  requestError.value = ''
  clearObject(config)
  clearObject(fieldErrors)
}

async function loadConnectors() {
  loadingConnectors.value = true
  requestError.value = ''
  try {
    connectors.value = await listConnectors(auth.apiFetch)
  }
  catch (error) {
    requestError.value = errorMessage(error)
  }
  finally {
    loadingConnectors.value = false
  }
}

function fieldError(field: ConnectorConfigField) {
  const code = fieldErrors[field.name]
  if (!code)
    return ''
  return t(`sources.create.validation.${code}`)
}

function arrayValue(field: ConnectorConfigField) {
  const value = config[field.name]
  return Array.isArray(value) ? JSON.stringify(value, null, 2) : String(value ?? '')
}

function setArrayValue(field: ConnectorConfigField, value: string) {
  config[field.name] = value
  delete fieldErrors[field.name]
}

function setValue(field: ConnectorConfigField, value: JsonValue | undefined) {
  config[field.name] = value
  delete fieldErrors[field.name]
}

function errorMessage(error: unknown) {
  if (!(error instanceof SourceClientError))
    return t('sources.create.errors.unknown')
  if (error.kind === 'network')
    return t('sources.create.errors.network')
  if (error.code === 'source.already-exists')
    return t('sources.create.errors.exists')
  return t('sources.create.errors.server')
}

async function submit() {
  clearObject(fieldErrors)
  requestError.value = ''

  if (!sourceId.value.trim())
    fieldErrors.id = t('sources.create.validation.required')
  else if (sourceId.value.includes('.'))
    fieldErrors.id = t('sources.create.validation.id')
  if (!connectorId.value)
    fieldErrors.connector = t('sources.create.validation.required')
  if (Object.keys(fieldErrors).length > 0 || connector.value === null)
    return

  const result = buildSourceConfig(connector.value.config, config)
  for (const [name, code] of Object.entries(result.errors))
    fieldErrors[name] = code
  if (Object.keys(fieldErrors).length > 0)
    return

  submitting.value = true
  try {
    const created = await createSource({
      id: sourceId.value.trim(),
      connector: connectorId.value,
      config: result.config,
      ...(sourceMode.value ? { mode: sourceMode.value } : {}),
    }, auth.apiFetch)
    emit('created', created)
    open.value = false
  }
  catch (error) {
    requestError.value = errorMessage(error)
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <ElDialog
    v-model="open"
    class="source-create-dialog"
    width="min(680px, calc(100vw - 32px))"
    align-center
    :close-on-click-modal="!submitting"
    :close-on-press-escape="!submitting"
    :show-close="!submitting"
  >
    <template #header>
      <div class="source-create-dialog__header">
        <span class="source-create-dialog__icon"><Database :size="18" /></span>
        <div>
          <h2>{{ t('sources.create.title') }}</h2>
          <p>{{ t('sources.create.subtitle') }}</p>
        </div>
      </div>
    </template>

    <div class="source-create-dialog__body">
      <div v-if="requestError" class="source-create-dialog__alert" role="alert">
        <AlertCircle :size="16" />
        <span>{{ requestError }}</span>
      </div>

      <div class="source-create-dialog__identity">
        <label class="source-field">
          <span class="source-field__label">{{ t('sources.create.idLabel') }}</span>
          <ElInput
            v-model="sourceId"
            :placeholder="t('sources.create.idPlaceholder')"
            :class="{ 'is-source-error': fieldErrors.id }"
            @input="delete fieldErrors.id"
          />
          <span v-if="fieldErrors.id" class="source-field__error">{{ fieldErrors.id }}</span>
          <span v-else class="source-field__hint">{{ t('sources.create.idHint') }}</span>
        </label>

        <label class="source-field">
          <span class="source-field__label">{{ t('sources.create.connectorLabel') }}</span>
          <ElSelect
            v-model="connectorId"
            class="w-full"
            filterable
            :loading="loadingConnectors"
            :placeholder="t('sources.create.connectorPlaceholder')"
            :class="{ 'is-source-error': fieldErrors.connector }"
          >
            <ElOption
              v-for="item in connectors"
              :key="item.id"
              :value="item.id"
              :label="item.name"
            >
              <div class="source-create-dialog__option">
                <span>{{ item.name }}</span>
                <small>{{ t('sources.create.optionMeta', { group: item.group, id: item.id }) }}</small>
              </div>
            </ElOption>
          </ElSelect>
          <span v-if="fieldErrors.connector" class="source-field__error">{{ fieldErrors.connector }}</span>
        </label>
      </div>

      <div v-if="loadingConnector" class="source-create-dialog__loading">
        <LoaderCircle class="animate-spin" :size="18" />
        {{ t('sources.create.loadingSchema') }}
      </div>

      <template v-else-if="connector">
        <div class="source-create-dialog__section-heading">
          <div>
            <h3>{{ t('sources.create.connectionTitle') }}</h3>
            <p>{{ t('sources.create.connectionSubtitle', { connector: connector.name }) }}</p>
          </div>
          <span class="source-create-dialog__origin">
            <Check :size="13" /> {{ connector.origin }}
          </span>
        </div>

        <label v-if="connector.modes.length > 0" class="source-field">
          <span class="source-field__label">{{ t('sources.create.modeLabel') }}</span>
          <ElSelect v-model="sourceMode" class="w-full">
            <ElOption v-for="mode in connector.modes" :key="mode" :label="mode" :value="mode" />
          </ElSelect>
        </label>

        <div v-if="visibleFields.length > 0" class="source-create-dialog__fields">
          <label v-for="field in visibleFields" :key="field.name" class="source-field">
            <span class="source-field__label">
              {{ field.label }}
              <small v-if="field.required">{{ t('sources.create.required') }}</small>
            </span>

            <ElSelect
              v-if="field.options.length > 0"
              :model-value="config[field.name]"
              class="w-full"
              :class="{ 'is-source-error': fieldErrors[field.name] }"
              @update:model-value="setValue(field, $event as JsonValue)"
            >
              <ElOption v-for="option in field.options" :key="option.value" :label="option.label" :value="option.value" />
            </ElSelect>

            <ElSwitch
              v-else-if="field.type === 'boolean'"
              :model-value="Boolean(config[field.name])"
              @update:model-value="setValue(field, $event)"
            />

            <ElInputNumber
              v-else-if="field.type === 'number'"
              :model-value="typeof config[field.name] === 'number' ? config[field.name] as number : undefined"
              class="w-full source-number-input"
              controls-position="right"
              @update:model-value="setValue(field, $event ?? undefined)"
            />

            <ElInput
              v-else-if="field.type === 'array'"
              type="textarea"
              :rows="3"
              :model-value="arrayValue(field)"
              :class="{ 'is-source-error': fieldErrors[field.name] }"
              :placeholder="t('sources.create.arrayPlaceholder')"
              @update:model-value="setArrayValue(field, $event)"
            />

            <ElInput
              v-else
              :model-value="String(config[field.name] ?? '')"
              :type="field.secret ? 'password' : 'text'"
              :show-password="field.secret"
              autocomplete="off"
              :class="{ 'is-source-error': fieldErrors[field.name] }"
              @update:model-value="setValue(field, $event)"
            />

            <span v-if="fieldError(field)" class="source-field__error">{{ fieldError(field) }}</span>
          </label>
        </div>

        <div v-else class="source-create-dialog__no-fields">
          {{ t('sources.create.noConfig') }}
        </div>
      </template>
    </div>

    <template #footer>
      <div class="source-create-dialog__footer">
        <ElButton :disabled="submitting" @click="open = false">
          {{ t('sources.create.cancel') }}
        </ElButton>
        <ElButton type="primary" :loading="submitting" :disabled="connector === null" @click="submit">
          {{ submitting ? t('sources.create.submitting') : t('sources.create.submit') }}
        </ElButton>
      </div>
    </template>
  </ElDialog>
</template>

<style scoped>
.source-create-dialog__header,
.source-create-dialog__section-heading,
.source-create-dialog__footer,
.source-create-dialog__option,
.source-create-dialog__alert,
.source-create-dialog__loading {
  display: flex;
  align-items: center;
}

.source-create-dialog__header {
  gap: 12px;
}

.source-create-dialog__header h2,
.source-create-dialog__section-heading h3 {
  margin: 0;
  color: #171717;
  font-weight: 650;
  letter-spacing: 0;
}

.source-create-dialog__header h2 {
  font-size: 18px;
}

.source-create-dialog__header p,
.source-create-dialog__section-heading p {
  margin: 4px 0 0;
  color: #737373;
  font-size: 13px;
}

.source-create-dialog__icon {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  color: #262626;
  background: #fafafa;
}

.source-create-dialog__body {
  display: grid;
  gap: 22px;
  max-height: min(calc(100vh - 220px), 680px);
  overflow-y: auto;
  padding-right: 4px;
}

.source-create-dialog__alert {
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid #fed7aa;
  border-radius: 6px;
  color: #9a3412;
  background: #fff7ed;
  font-size: 13px;
}

.source-create-dialog__identity,
.source-create-dialog__fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px 16px;
}

.source-field {
  display: grid;
  align-content: start;
  gap: 7px;
  min-width: 0;
}

.source-field__label {
  color: #404040;
  font-size: 12px;
  font-weight: 600;
}

.source-field__label small {
  margin-left: 5px;
  color: #a3a3a3;
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
}

.source-field__hint,
.source-field__error {
  font-size: 11px;
  line-height: 1.4;
}

.source-field__hint {
  color: #a3a3a3;
}

.source-field__error {
  color: #c2410c;
}

.source-create-dialog__loading,
.source-create-dialog__no-fields {
  min-height: 72px;
  justify-content: center;
  color: #737373;
  font-size: 13px;
}

.source-create-dialog__section-heading {
  justify-content: space-between;
  gap: 16px;
  padding-top: 18px;
  border-top: 1px solid #ededed;
}

.source-create-dialog__section-heading h3 {
  font-size: 14px;
}

.source-create-dialog__origin {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 4px;
  color: #525252;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 10px;
  text-transform: uppercase;
}

.source-create-dialog__option {
  width: 100%;
  justify-content: space-between;
  gap: 20px;
}

.source-create-dialog__option small {
  color: #a3a3a3;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 10px;
}

.source-create-dialog__footer {
  justify-content: flex-end;
  gap: 8px;
}

:deep(.source-number-input) {
  width: 100%;
}

:deep(.is-source-error .el-input__wrapper),
:deep(.is-source-error .el-select__wrapper),
:deep(.is-source-error .el-textarea__inner) {
  box-shadow: 0 0 0 1px #fb923c inset;
}

@media (max-width: 620px) {
  .source-create-dialog__identity,
  .source-create-dialog__fields {
    grid-template-columns: 1fr;
  }
}
</style>
