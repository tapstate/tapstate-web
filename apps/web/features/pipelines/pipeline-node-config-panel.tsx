import type { Field } from '@formily/core'

import { connect, mapProps } from '@formily/react'
import * as AntdFormily from '@potop/formily-antd-v6'
import { FormilySchema, useFormilyForm, type FormilyComponentMap } from '@tapstate-web/formily'
import { Input as AntdInput } from 'antd'
import { ChevronUp } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'

import type { PipelineJsonObject } from '@/service/pipeline-client'

import { FormilyAntdProvider } from '@/components/formily/formily-antd-provider'
import { Button } from '@/components/ui/button'

import type { PipelineCanvasSelection } from './pipeline-canvas-types'
import type {
  PipelineNodeConfiguration,
  PipelineNodeConfigurationChange,
} from './pipeline-node-model'
import type { PipelineTransformConfigurationPatch } from './transform/types'

import {
  createPipelineDataNodeSchema,
  type PipelineFormilySchema,
  type PipelineSchemaOption,
} from './pipeline-node-schema'
import { TransformEditor } from './transform/transform-editor'

type FormValues = Record<string, unknown>

const formilyComponents: FormilyComponentMap = {
  FormItem: AntdFormily.FormItem,
  Input: AntdFormily.Input,
  TextArea: connect(
    (props: ComponentProps<typeof AntdInput.TextArea>) => <AntdInput.TextArea {...props} />,
    mapProps((props, field) => {
      const connectedField = field as Field | undefined
      return {
        ...props,
        value: connectedField?.value,
        onChange: (event: ChangeEvent<HTMLTextAreaElement>) =>
          connectedField?.onInput(event.target.value),
      }
    }),
  ),
  Select: AntdFormily.Select,
}

function localizedDataSchema(
  kind: 'source' | 'target',
  t: (key: string) => string,
  options: {
    sourceOptions?: readonly PipelineSchemaOption[]
    tableOptions?: readonly PipelineSchemaOption[]
  } = {},
) {
  const labels: Record<string, string> =
    kind === 'source'
      ? {
          sourceId: t('pipelines.workspace.config.source'),
          table: t('pipelines.workspace.config.table'),
          connector: t('pipelines.workspace.config.connector'),
          filter: t('pipelines.workspace.config.filter'),
        }
      : {
          sourceId: t('pipelines.workspace.config.targetSource'),
          table: t('pipelines.workspace.config.targetTable'),
          connector: t('pipelines.workspace.config.connector'),
          writeMode: t('pipelines.workspace.config.writeMode'),
        }
  const schema = createPipelineDataNodeSchema(kind, {
    labels,
    sourceOptions: options.sourceOptions,
    tableOptions: options.tableOptions,
  })
  const properties = Object.fromEntries(
    Object.entries(schema.properties ?? {}).map(([name, property]) => [
      name,
      name === 'writeMode'
        ? {
            ...property,
            enum: [
              { label: t('pipelines.workspace.transform.upsert'), value: 'upsert' },
              { label: t('pipelines.workspace.transform.append'), value: 'append' },
            ],
          }
        : property,
    ]),
  )
  return { ...schema, properties } satisfies PipelineFormilySchema
}

function dataNodeValues(
  configuration: Extract<PipelineNodeConfiguration, { kind: 'source' | 'target' }>,
): FormValues {
  return {
    sourceId: configuration.sourceId,
    table: configuration.table,
    connector: configuration.connectorId ?? '',
    filter: configuration.kind === 'source' ? (configuration.filter ?? '') : undefined,
    writeMode: configuration.kind === 'target' ? configuration.writeMode : undefined,
  }
}

function DataNodeForm({
  configuration,
  sourceOptions,
  tableOptions,
  onChange,
}: {
  configuration: Extract<PipelineNodeConfiguration, { kind: 'source' | 'target' }>
  sourceOptions?: readonly PipelineSchemaOption[]
  tableOptions?: readonly PipelineSchemaOption[]
  onChange?: (values: FormValues) => void
}) {
  const { t } = useTranslation()
  const [values, setValues] = useState<FormValues>(() => dataNodeValues(configuration))
  const synchronizing = useRef(false)
  const formKey = `${configuration.nodeId}:${configuration.kind}`
  const form = useFormilyForm<FormValues>({
    resetKey: formKey,
    initialValues: values,
    onValuesChange: (nextValues) => {
      if (synchronizing.current) return
      setValues(nextValues)

      // Connector is a read-only projection field and is not part of the editable payload.
      const { connector: _connector, ...editableValues } = nextValues
      onChange?.(editableValues)
    },
  })
  const schema = useMemo(
    () => localizedDataSchema(configuration.kind, t, { sourceOptions, tableOptions }),
    [configuration.kind, sourceOptions, tableOptions, t],
  )

  useEffect(() => {
    const nextValues = dataNodeValues(configuration)
    setValues(nextValues)

    // Formily owns the rendered field values. Keep the form in sync when the
    // selected node changes or an external projection update replaces the
    // configuration, without recreating the form and losing field metadata.
    if (JSON.stringify(form.values) !== JSON.stringify(nextValues)) {
      synchronizing.current = true
      form.setValues(nextValues)
      queueMicrotask(() => {
        synchronizing.current = false
      })
    }
  }, [configuration, form])

  return (
    <FormilyAntdProvider>
      <div className="pipeline-node-config__form">
        <AntdFormily.FormLayout layout="vertical">
          <FormilySchema form={form} schema={schema} components={formilyComponents} />
        </AntdFormily.FormLayout>
      </div>
      <p className="pipeline-node-config__hint">{t('pipelines.workspace.config.localDraft')}</p>
      <span className="sr-only">{JSON.stringify(values)}</span>
    </FormilyAntdProvider>
  )
}

function transformPatchValues(patch: PipelineTransformConfigurationPatch): PipelineJsonObject {
  return {
    ...patch.body,
    ...(patch.from === undefined ? {} : { from: patch.from }),
    ...(patch.options === undefined ? {} : { options: patch.options }),
  }
}

export function PipelineNodeConfigPanel({
  selection,
  onClose,
  onConfigurationChange,
  sourceOptions,
  tableOptions,
}: {
  selection: PipelineCanvasSelection
  onClose: () => void
  onConfigurationChange?: (change: PipelineNodeConfigurationChange) => void
  sourceOptions?: readonly PipelineSchemaOption[]
  tableOptions?: readonly PipelineSchemaOption[]
}) {
  const { t } = useTranslation()
  const configuration = selection.configuration
  const emit = (values: PipelineJsonObject) => {
    if (!configuration) return
    onConfigurationChange?.({ nodeId: configuration.nodeId, kind: configuration.kind, values })
  }

  return (
    <>
      <div className="pipeline-node-config__header">
        <div className="min-w-0">
          <p className="pipeline-node-config__eyebrow">
            {t('pipelines.workspace.inspector.eyebrow')}
          </p>
          <h2>{selection.label}</h2>
          <p className="pipeline-node-config__id">{selection.id}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t('pipelines.workspace.config.close')}
          onClick={onClose}
        >
          <ChevronUp className="size-4" />
        </Button>
      </div>
      <div className="pipeline-node-config__scroll">
        {configuration?.kind === 'source' || configuration?.kind === 'target' ? (
          <DataNodeForm
            configuration={configuration}
            sourceOptions={sourceOptions}
            tableOptions={tableOptions}
            onChange={emit}
          />
        ) : null}
        {configuration?.kind === 'transform' ? (
          <TransformEditor
            config={configuration}
            onChange={(patch) => emit(transformPatchValues(patch))}
          />
        ) : null}
        {configuration?.kind === 'view' ? (
          <div className="pipeline-node-config__empty">
            {t('pipelines.workspace.config.viewReadOnly')}
          </div>
        ) : null}
        {!configuration ? (
          <div className="pipeline-node-config__empty">
            {t('pipelines.workspace.inspector.emptyBody')}
          </div>
        ) : null}
      </div>
    </>
  )
}
