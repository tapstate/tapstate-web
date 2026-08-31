import type { Field } from '@formily/core'

import { connect, mapProps } from '@formily/react'
import * as AntdFormily from '@potop/formily-antd-v6'
import { FormilySchema, useFormilyForm, type FormilyComponentMap } from '@tapstate-web/formily'
import { Input as AntdInput } from 'antd'
import { X } from 'lucide-react'
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentProps,
} from 'react'
import { useTranslation } from 'react-i18next'

import type { PipelineJsonObject } from '@/service/pipelines/pipeline-client'

import { FormilyAntdProvider } from '@/components/formily/formily-antd-provider'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

import type {
  PipelineNodeConfiguration,
  PipelineNodeConfigurationChange,
} from '../../model/pipeline-node-model'
import type { PipelineCanvasSelection } from '../canvas/pipeline-canvas-types'
import type { PipelineTransformConfigurationPatch } from '../transform/types'

import { PipelineNodeIcon } from '../canvas/pipeline-node-icon'
import { TransformEditor } from '../transform/transform-editor'
import {
  createPipelineDataNodeSchema,
  type PipelineFormilySchema,
  type PipelineSchemaOption,
  type PipelineTableLoader,
} from './pipeline-data-node-schema'

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
    loadTables?: PipelineTableLoader
  } = {},
) {
  const labels: Record<string, string> =
    kind === 'source'
      ? {
          sourceId: t('pipelines.workspace.config.source'),
          table: t('pipelines.workspace.config.table'),
          filter: t('pipelines.workspace.config.filter'),
        }
      : {
          sourceId: t('pipelines.workspace.config.targetSource'),
          table: t('pipelines.workspace.config.targetTable'),
          writeMode: t('pipelines.workspace.config.writeMode'),
        }
  const schema = createPipelineDataNodeSchema(kind, {
    labels,
    sourceOptions: options.sourceOptions,
    tableOptions: options.tableOptions,
    loadTables: options.loadTables,
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
    filter: configuration.kind === 'source' ? (configuration.filter ?? '') : undefined,
    writeMode: configuration.kind === 'target' ? configuration.writeMode : undefined,
  }
}

function DataNodeForm({
  configuration,
  sourceOptions,
  tableOptions,
  loadTables,
  onChange,
}: {
  configuration: Extract<PipelineNodeConfiguration, { kind: 'source' | 'target' }>
  sourceOptions?: readonly PipelineSchemaOption[]
  tableOptions?: readonly PipelineSchemaOption[]
  loadTables?: PipelineTableLoader
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

      onChange?.(nextValues)
    },
  })
  const schema = useMemo(
    () => localizedDataSchema(configuration.kind, t, { sourceOptions, tableOptions, loadTables }),
    [configuration.kind, loadTables, sourceOptions, tableOptions, t],
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
  onDescriptionChange,
  sourceOptions,
  tableOptions,
  loadTables,
}: {
  selection: PipelineCanvasSelection
  onClose: () => void
  onConfigurationChange?: (change: PipelineNodeConfigurationChange) => void
  onDescriptionChange?: (description: string) => void
  sourceOptions?: readonly PipelineSchemaOption[]
  tableOptions?: readonly PipelineSchemaOption[]
  loadTables?: PipelineTableLoader
}) {
  const { t } = useTranslation()
  const configuration = selection.configuration
  const [description, setDescription] = useState(selection.description)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setDescription(selection.description)
  }, [selection.description, selection.id])

  useLayoutEffect(() => {
    const textarea = descriptionRef.current
    if (!textarea) return

    textarea.style.height = '0px'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 60)}px`
  }, [description])

  const emit = (values: PipelineJsonObject) => {
    if (!configuration) return
    onConfigurationChange?.({ nodeId: configuration.nodeId, kind: configuration.kind, values })
  }

  return (
    <>
      <div className="pipeline-node-config__header">
        <div className="pipeline-node-config__title-row">
          <PipelineNodeIcon data={selection} />
          <div className="min-w-0 flex-1">
            <h2>{selection.label}</h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6 max-sm:size-10"
            aria-label={t('pipelines.workspace.config.close')}
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        </div>
        <div className="pipeline-node-config__description-editor">
          <div className="pipeline-node-config__description-input">
            <Textarea
              aria-label={t('pipelines.workspace.config.description')}
              className="pipeline-node-config__description"
              placeholder={t('pipelines.workspace.config.descriptionPlaceholder')}
              ref={descriptionRef}
              rows={1}
              value={description}
              onChange={(event) => {
                const nextDescription = event.target.value
                setDescription(nextDescription)
                onDescriptionChange?.(nextDescription)
              }}
            />
          </div>
        </div>
      </div>
      <div className="pipeline-node-config__scroll">
        {configuration?.kind === 'source' || configuration?.kind === 'target' ? (
          <DataNodeForm
            configuration={configuration}
            sourceOptions={sourceOptions}
            tableOptions={tableOptions}
            loadTables={loadTables}
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
