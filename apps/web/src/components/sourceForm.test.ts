import type { ConnectorConfigField } from '../services/sourceClient.ts'
import {
  buildSourceConfig,
  createInitialConfig,
  isFieldVisible,
} from './sourceForm.ts'

const fields: ConnectorConfigField[] = [
  {
    name: 'protocol',
    type: 'string',
    label: 'Protocol',
    required: true,
    defaultValue: 'tcp',
    secret: false,
    options: [
      { value: 'tcp', label: 'TCP' },
      { value: 'ssh', label: 'SSH tunnel' },
    ],
    visibleWhen: null,
  },
  {
    name: 'port',
    type: 'number',
    label: 'Port',
    required: true,
    defaultValue: '5432',
    secret: false,
    options: [],
    visibleWhen: null,
  },
  {
    name: 'ssl',
    type: 'boolean',
    label: 'Use SSL',
    required: false,
    defaultValue: 'true',
    secret: false,
    options: [],
    visibleWhen: null,
  },
  {
    name: 'sshHost',
    type: 'string',
    label: 'SSH host',
    required: true,
    defaultValue: null,
    secret: false,
    options: [],
    visibleWhen: { controllingField: 'protocol', equalsAnyOf: ['ssh'] },
  },
  {
    name: 'nodes',
    type: 'array',
    label: 'Nodes',
    required: false,
    defaultValue: '["db-1","db-2"]',
    secret: false,
    options: [],
    visibleWhen: null,
  },
]

const initial = createInitialConfig(fields)

if (initial.port !== 5432 || initial.ssl !== true) {
  throw new Error('numeric and boolean defaults must be typed')
}

if (!Array.isArray(initial.nodes) || initial.nodes.length !== 2) {
  throw new Error('array defaults must be represented as arrays')
}

if (isFieldVisible(fields[3], initial)) {
  throw new Error('a conditional field must stay hidden until its rule matches')
}

const hiddenResult = buildSourceConfig(fields, { ...initial, sshHost: 'bastion.internal' })
if ('sshHost' in hiddenResult.config) {
  throw new Error('hidden fields must not be submitted')
}

const invalid = buildSourceConfig(fields, { ...initial, port: 'not-a-number' })
if (invalid.errors.port === undefined) {
  throw new Error('invalid numbers must produce a field error')
}

const visibleResult = buildSourceConfig(fields, {
  ...initial,
  protocol: 'ssh',
  sshHost: 'bastion.internal',
})
if (visibleResult.config.sshHost !== 'bastion.internal') {
  throw new Error('visible values must be submitted')
}
