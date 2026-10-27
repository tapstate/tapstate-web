import type { ISchema } from '@formily/json-schema'

import type { ConnectorConfigField, JsonValue } from '@/service/source-client'

import type { FormConnectorConfigField, SourceConfigState } from './source-form'

type JsonRecord = Record<string, unknown>

function asRecord(value: unknown): JsonRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : null
}

function resolveSchemaMessages(value: unknown, messages: JsonRecord): unknown {
  if (typeof value === 'string') {
    return value.replace(/\$\{([^{}]+)\}/g, (template, key: string) => {
      const message = messages[key.trim()]
      return typeof message === 'string' ? message : template
    })
  }

  if (Array.isArray(value)) return value.map((item) => resolveSchemaMessages(item, messages))

  const record = asRecord(value)
  if (record === null) return value

  const resolved: JsonRecord = {}
  for (const [key, child] of Object.entries(record)) {
    resolved[key] = resolveSchemaMessages(child, messages)
  }
  return resolved
}

function parseConnectionSchema(text: string): { connection: JsonRecord; spec: JsonRecord } {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Connector spec contains invalid JSON')
  }

  const spec = asRecord(parsed)
  if (spec === null) throw new Error('Connector spec does not declare configOptions.connection')
  const options = asRecord(spec?.configOptions)
  const connection = asRecord(options?.connection)
  if (connection === null || asRecord(connection.properties) === null)
    throw new Error('Connector spec does not declare configOptions.connection')
  return { connection, spec }
}

function specHasTag(spec: JsonRecord, tag: string) {
  const properties = asRecord(spec.properties)
  return Array.isArray(properties?.tags) && properties.tags.includes(tag)
}

function injectedLabel(locale: string, key: string) {
  const labels: Record<string, Record<string, string>> = {
    en: {
      sslSettings: 'TLS settings',
      useSSL: 'Use TLS',
      sslCa: 'CA certificate',
      sslCert: 'Client certificate',
      sslKey: 'Client key',
      sslKeyPassword: 'Client key password',
      sshSettings: 'SSH tunnel',
      useSSH: 'Use SSH tunnel',
      sshHost: 'SSH host',
      sshPort: 'SSH port',
      sshUsername: 'SSH username',
      sshPassword: 'SSH password',
    },
    'zh-CN': {
      sslSettings: 'TLS 配置',
      useSSL: '使用 TLS',
      sslCa: 'CA 证书',
      sslCert: '客户端证书',
      sslKey: '客户端密钥',
      sslKeyPassword: '客户端密钥密码',
      sshSettings: 'SSH 隧道',
      useSSH: '使用 SSH 隧道',
      sshHost: 'SSH 主机',
      sshPort: 'SSH 端口',
      sshUsername: 'SSH 用户名',
      sshPassword: 'SSH 密码',
    },
    'zh-TW': {
      sslSettings: 'TLS 設定',
      useSSL: '使用 TLS',
      sslCa: 'CA 憑證',
      sslCert: '用戶端憑證',
      sslKey: '用戶端金鑰',
      sslKeyPassword: '用戶端金鑰密碼',
      sshSettings: 'SSH 通道',
      useSSH: '使用 SSH 通道',
      sshHost: 'SSH 主機',
      sshPort: 'SSH 連接埠',
      sshUsername: 'SSH 使用者名稱',
      sshPassword: 'SSH 密碼',
    },
  }
  const normalizedLocale = locale.replace('_', '-')
  return (
    labels[normalizedLocale]?.[key] ??
    labels[normalizedLocale.split('-')[0]]?.[key] ??
    labels.en[key]
  )
}

type SyntheticConnectorConfigField = FormConnectorConfigField

function syntheticField(
  name: string,
  type: ConnectorConfigField['type'],
  label: string,
  options: { secret?: boolean; clearable?: boolean } = {},
): SyntheticConnectorConfigField {
  return {
    name,
    type,
    label,
    required: false,
    defaultValue: type === 'boolean' ? 'false' : null,
    secret: options.secret ?? false,
    options: [],
    visibleWhen: null,
    ...(options.clearable ? { clearable: true } : {}),
  }
}

export function connectorSpecInjectedFields(
  text: string,
  locale = 'en',
): SyntheticConnectorConfigField[] {
  const { spec } = parseConnectionSchema(text)
  const fields: SyntheticConnectorConfigField[] = []
  if (specHasTag(spec, 'ssl')) {
    fields.push(
      syntheticField('useSSL', 'boolean', injectedLabel(locale, 'useSSL')),
      syntheticField('sslCa', 'string', injectedLabel(locale, 'sslCa'), { clearable: true }),
      syntheticField('sslCAFile', 'string', 'CA certificate file name', { clearable: true }),
      syntheticField('sslCert', 'string', injectedLabel(locale, 'sslCert'), { clearable: true }),
      syntheticField('sslCertFile', 'string', 'Client certificate file name', { clearable: true }),
      syntheticField('sslKey', 'string', injectedLabel(locale, 'sslKey'), {
        secret: true,
        clearable: true,
      }),
      syntheticField('sslKeyFile', 'string', 'Client key file name', { clearable: true }),
      syntheticField('sslKeyPassword', 'string', injectedLabel(locale, 'sslKeyPassword'), {
        secret: true,
      }),
    )
  }
  if (specHasTag(spec, 'ssh')) {
    fields.push(
      syntheticField('__TAPDATA.useSSH', 'boolean', injectedLabel(locale, 'useSSH')),
      syntheticField('__TAPDATA.sshHost', 'string', injectedLabel(locale, 'sshHost')),
      syntheticField('__TAPDATA.sshPort', 'number', injectedLabel(locale, 'sshPort')),
      syntheticField('__TAPDATA.sshUsername', 'string', injectedLabel(locale, 'sshUsername')),
      syntheticField('__TAPDATA.sshPassword', 'string', injectedLabel(locale, 'sshPassword'), {
        secret: true,
      }),
    )
  }
  return fields
}

export function connectorSpecConfigFields(
  text: string,
  fields: readonly FormConnectorConfigField[],
  locale = 'en',
): FormConnectorConfigField[] {
  const { connection } = parseConnectionSchema(text)
  const rawReaderFields = textFileReaderFields(connection)
  const rawReaderFileNames = new Set(
    rawReaderFields.flatMap((field) =>
      field.fileNameField === undefined ? [] : [field.fileNameField],
    ),
  )
  const rawReaderNames = new Set([
    ...rawReaderFields.map((field) => field.name),
    ...rawReaderFileNames,
  ])
  const normalized = fields.map((field) => ({
    ...field,
    ...(field.name === 'sslKey' ? { secret: true } : {}),
    ...(rawReaderNames.has(field.name) ? { clearable: true } : {}),
  }))
  const existingNames = new Set(normalized.map((field) => field.name))
  const additions: SyntheticConnectorConfigField[] = []
  for (const field of [
    ...connectorSpecInjectedFields(text, locale),
    ...rawReaderFields
      .filter((field) => !existingNames.has(field.name))
      .map((field) => syntheticField(field.name, 'string', field.name, { clearable: true })),
    ...[...rawReaderFileNames].map((name) =>
      syntheticField(name, 'string', name, { clearable: true }),
    ),
  ]) {
    if (existingNames.has(field.name)) continue
    existingNames.add(field.name)
    additions.push(field)
  }
  return [...normalized, ...additions]
}

interface RawTextFileReaderField {
  name: string
  fileNameField?: string
}

function textFileReaderFields(connection: JsonRecord): RawTextFileReaderField[] {
  const fields: RawTextFileReaderField[] = []

  function visit(node: unknown, path: string[] = []) {
    const record = asRecord(node)
    if (record === null) return

    const properties = asRecord(record.properties)
    if (properties === null) return

    for (const [name, value] of Object.entries(properties)) {
      const property = asRecord(value)
      if (property === null) continue
      const propertyPath = property.type === 'void' ? path : [...path, name]
      if (property['x-component'] === 'TextFileReader') {
        const componentProps = asRecord(property['x-component-props'])
        const fileNameField = property.fileNameField ?? componentProps?.fileNameField
        fields.push({
          name: propertyPath.join('.'),
          ...(typeof fileNameField === 'string' && fileNameField.trim() !== ''
            ? { fileNameField }
            : {}),
        })
      }
      visit(property, propertyPath)
    }
  }

  visit(connection)
  return fields
}

function fieldSchema(
  type: ConnectorConfigField['type'],
  title: string,
  component: string,
  props?: Record<string, unknown>,
): JsonRecord {
  return {
    type,
    title,
    'x-decorator': 'FormItem',
    'x-component': component,
    ...(props === undefined ? {} : { 'x-component-props': props }),
  }
}

function tlsEnabledReaction(): JsonRecord {
  return {
    dependencies: ['useSSL'],
    fulfill: {
      state: {
        visible: '{{$deps[0] === true || $deps[0] === "true"}}',
      },
    },
  }
}

function withInjectedConnectionSections(
  connection: JsonRecord,
  spec: JsonRecord,
  locale: string,
): JsonRecord {
  const properties = { ...asRecord(connection.properties) }
  if (specHasTag(spec, 'ssl')) {
    properties.__tapstateSsl = {
      type: 'void',
      'x-component': 'ConfigSection',
      'x-component-props': { title: injectedLabel(locale, 'sslSettings'), headerControl: true },
      properties: {
        useSSL: fieldSchema('boolean', injectedLabel(locale, 'useSSL'), 'Switch'),
        sslCa: {
          ...fieldSchema('string', injectedLabel(locale, 'sslCa'), 'TextFileReader', {
            base64: true,
          }),
          'x-reactions': tlsEnabledReaction(),
          fileNameField: 'sslCAFile',
        },
        sslCert: {
          ...fieldSchema('string', injectedLabel(locale, 'sslCert'), 'TextFileReader', {
            base64: true,
          }),
          'x-reactions': tlsEnabledReaction(),
          fileNameField: 'sslCertFile',
        },
        sslKey: {
          ...fieldSchema('string', injectedLabel(locale, 'sslKey'), 'TextFileReader', {
            base64: true,
          }),
          'x-reactions': tlsEnabledReaction(),
          fileNameField: 'sslKeyFile',
        },
        sslKeyPassword: {
          ...fieldSchema('string', injectedLabel(locale, 'sslKeyPassword'), 'Password'),
          'x-reactions': tlsEnabledReaction(),
        },
      },
    }
  }
  if (specHasTag(spec, 'ssh')) {
    const existingTapdata = asRecord(properties.__TAPDATA) ?? {}
    const existingTapdataProperties = asRecord(existingTapdata.properties) ?? {}
    properties.__tapstateSsh = {
      type: 'void',
      'x-component': 'ConfigSection',
      'x-component-props': { title: injectedLabel(locale, 'sshSettings') },
      properties: {
        __TAPDATA: {
          ...existingTapdata,
          type: 'object',
          properties: {
            ...existingTapdataProperties,
            useSSH: fieldSchema('boolean', injectedLabel(locale, 'useSSH'), 'Switch'),
            sshHost: fieldSchema('string', injectedLabel(locale, 'sshHost'), 'Input'),
            sshPort: fieldSchema('number', injectedLabel(locale, 'sshPort'), 'InputNumber'),
            sshUsername: fieldSchema('string', injectedLabel(locale, 'sshUsername'), 'Input'),
            sshPassword: fieldSchema('string', injectedLabel(locale, 'sshPassword'), 'Password'),
          },
        },
      },
    }
  }
  return { ...connection, properties }
}

function messageLocaleCandidates(locale: string) {
  const normalized = locale.replace('-', '_')
  const candidates = normalized === 'en' ? ['en_US', 'en'] : [normalized, locale]
  return [...new Set(candidates)]
}

function messagesForLocale(spec: JsonRecord, locale: string) {
  const messages = asRecord(spec.messages)
  if (messages === null) return {}

  for (const candidate of messageLocaleCandidates(locale)) {
    const localizedMessages = asRecord(messages[candidate])
    if (localizedMessages !== null) return localizedMessages
  }
  return {}
}

const MONGODB_PRESENTATION_FIELD_NAMES = new Set(['isUrlTips1', 'isUrlTips2', 'uriTips'])

function isMongoDbConnector(connectorId: string | undefined) {
  return connectorId?.trim().toLocaleLowerCase() === 'mongodb'
}

function isAtlasConnector(connectorId: string | undefined) {
  return connectorId?.trim().toLocaleLowerCase() === 'mongodb-atlas'
}

function withMongoUriSchema(node: JsonRecord, connectorId?: string): JsonRecord {
  if (!isMongoDbConnector(connectorId) && !isAtlasConnector(connectorId)) return node
  const properties = asRecord(node.properties)
  const uri = asRecord(properties?.uri)
  if (properties === null || uri === null) return node

  const validators = uri['x-validator']
  const legacyAtlasPattern = String.raw`^mongodb\+srv:\/\/[^/]+\/([^/?]+)`
  const nextValidators =
    isAtlasConnector(connectorId) && Array.isArray(validators)
      ? validators.map((value) => {
          const validator = asRecord(value)
          return validator?.pattern === legacyAtlasPattern
            ? { ...validator, pattern: String.raw`^mongodb(?:\+srv)?:\/\/[^/]+\/([^/?]+)` }
            : value
        })
      : validators
  return {
    ...node,
    properties: {
      ...properties,
      uri: {
        ...uri,
        ...(uri['x-component'] === 'Input' ? { 'x-component': 'Password' } : {}),
        ...(nextValidators === undefined ? {} : { 'x-validator': nextValidators }),
      },
    },
  }
}

function isMysqlConnector(connectorId: string | undefined) {
  return connectorId?.trim().toLocaleLowerCase() === 'mysql'
}

function finiteNumber(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (typeof value !== 'string' || value.trim() === '') return undefined

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

/**
 * A few connector specs predate the typed catalog contract. MySQL's top-level
 * port is one of those fields: it is declared as a string while rendered by
 * InputNumber. Keep this compatibility rule at the spec boundary so both the
 * Formily schema and its defaults agree on the value type.
 */
function withConnectorSpecificSchema(node: JsonRecord, connectorId?: string): JsonRecord {
  if (!isMysqlConnector(connectorId)) return withMongoUriSchema(node, connectorId)

  const properties = asRecord(node.properties)
  const port = asRecord(properties?.port)
  if (properties === null || port === null) return node

  const defaultPort = finiteNumber(port.default)
  return {
    ...node,
    properties: {
      ...properties,
      port: {
        ...port,
        type: 'number',
        ...(defaultPort === undefined ? {} : { default: defaultPort }),
      },
    },
  }
}

function withoutMongoDbPresentationFields(node: JsonRecord): JsonRecord {
  const properties = asRecord(node.properties)
  if (properties === null) return node

  const nextProperties = Object.fromEntries(
    Object.entries(properties)
      .filter(([name]) => !MONGODB_PRESENTATION_FIELD_NAMES.has(name))
      .map(([name, value]) => {
        const property = asRecord(value)
        return [name, property === null ? value : withoutMongoDbPresentationFields(property)]
      }),
  )
  const required = Array.isArray(node.required)
    ? node.required.filter(
        (name): name is string =>
          typeof name === 'string' && !MONGODB_PRESENTATION_FIELD_NAMES.has(name),
      )
    : node.required

  return {
    ...node,
    properties: nextProperties,
    ...(required === undefined ? {} : { required }),
  }
}

function connectionSchema(text: string, locale: string, connectorId?: string): JsonRecord {
  const { connection, spec } = parseConnectionSchema(text)
  const resolved = resolveSchemaMessages(connection, messagesForLocale(spec, locale)) as JsonRecord
  const injected = withInjectedConnectionSections(resolved, spec, locale)
  const normalized = withConnectorSpecificSchema(injected, connectorId)
  return isMongoDbConnector(connectorId) ? withoutMongoDbPresentationFields(normalized) : normalized
}

export function connectorSpecConnectionSchema(
  text: string,
  locale: string,
  connectorId?: string,
): ISchema {
  return connectionSchema(text, locale, connectorId) as ISchema
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null) return true
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
    return true
  if (Array.isArray(value)) return value.every(isJsonValue)
  if (typeof value !== 'object') return false
  return Object.values(value).every(isJsonValue)
}

function setPath(values: SourceConfigState, path: readonly string[], value: JsonValue) {
  let target = values as Record<string, unknown>
  for (const segment of path.slice(0, -1)) {
    const existing = asRecord(target[segment])
    if (existing === null) target[segment] = {}
    target = target[segment] as Record<string, unknown>
  }
  const last = path.at(-1)
  if (last) target[last] = value
}

function readDefaults(node: JsonRecord, values: SourceConfigState, path: string[] = []) {
  const properties = asRecord(node.properties)
  if (properties === null) return

  for (const [name, value] of Object.entries(properties)) {
    const property = asRecord(value)
    if (property === null) continue
    const propertyPath = property.type === 'void' ? path : [...path, name]
    if (property.default !== undefined && isJsonValue(property.default))
      setPath(values, propertyPath, property.default)
    readDefaults(property, values, propertyPath)
  }
}

export function connectorSpecInitialValues(text: string, connectorId?: string): SourceConfigState {
  const values: SourceConfigState = {}
  const { connection, spec } = parseConnectionSchema(text)
  const injected = withInjectedConnectionSections(connection, spec, 'en')
  readDefaults(
    isMongoDbConnector(connectorId)
      ? withoutMongoDbPresentationFields(withConnectorSpecificSchema(injected, connectorId))
      : withConnectorSpecificSchema(injected, connectorId),
    values,
  )
  return values
}

/**
 * Align catalog field metadata with connector-specific spec fixes. This is
 * intentionally narrow: only the MySQL connection port is corrected, while
 * unrelated connectors keep the catalog-declared type.
 */
export function normalizeConnectorConfigFields(
  connectorId: string | undefined,
  fields: readonly FormConnectorConfigField[],
): FormConnectorConfigField[] {
  if (!isMysqlConnector(connectorId)) return [...fields]

  return fields.map((field) =>
    field.name === 'port' ? { ...field, type: 'number' as const } : field,
  )
}

export function normalizeConnectorConfigValues(
  connectorId: string | undefined,
  values: Record<string, unknown>,
): SourceConfigState {
  const normalized = { ...values } as SourceConfigState
  if (!isMysqlConnector(connectorId) || !Object.hasOwn(values, 'port')) return normalized

  const port = finiteNumber(values.port)
  if (port !== undefined) normalized.port = port
  return normalized
}
