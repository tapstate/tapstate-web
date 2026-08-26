import { Input } from 'antd'
import { Code2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { TransformEditorProps } from './types'

import { FilterEditor } from './filter-editor'
import { JoinEditor } from './join-editor'
import { JsEditor } from './js-editor'
import { MapEditor } from './map-editor'
import { NestEditor } from './nest-editor'
import { TransformEditorShell } from './transform-editor-shell'
import { UnionEditor } from './union-editor'

export function TransformEditor({ config, onChange }: TransformEditorProps) {
  const { t } = useTranslation()
  switch (config.transformType) {
    case 'filter':
      return <FilterEditor config={config} onChange={onChange} />
    case 'map':
      return <MapEditor config={config} onChange={onChange} />
    case 'join':
      return <JoinEditor config={config} onChange={onChange} />
    case 'union':
      return <UnionEditor config={config} onChange={onChange} />
    case 'nest':
      return <NestEditor config={config} onChange={onChange} />
    case 'js':
      return <JsEditor config={config} onChange={onChange} />
    default:
      return (
        <UnknownTransformEditor
          config={config}
          onChange={onChange}
          title={config.transformType}
          description={t('pipelines.workspace.transform.customDescription')}
        />
      )
  }
}

function UnknownTransformEditor({
  config,
  onChange,
  title,
  description,
}: TransformEditorProps & { title: string; description: string }) {
  const { t } = useTranslation()
  const [raw, setRaw] = useState(() => JSON.stringify(config.body, null, 2))
  const [invalid, setInvalid] = useState(false)
  const configurationKey = JSON.stringify(config.body)

  useEffect(() => {
    setRaw(JSON.stringify(config.body, null, 2))
    setInvalid(false)
  }, [configurationKey])

  function updateRaw(next: string) {
    setRaw(next)
    try {
      const parsed: unknown = JSON.parse(next)
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
        throw new Error('object required')
      setInvalid(false)
      onChange?.({ body: parsed as Record<string, unknown> })
    } catch {
      setInvalid(true)
    }
  }

  return (
    <TransformEditorShell from={config.from} icon={Code2} title={title} description={description}>
      <Input.TextArea
        value={raw}
        onChange={(event) => updateRaw(event.target.value)}
        autoSize={{ minRows: 8, maxRows: 16 }}
        className="pipeline-transform__code-editor"
        aria-invalid={invalid}
      />
      {invalid && (
        <p className="pipeline-transform__validation">
          {t('pipelines.workspace.transform.invalidObjectJson')}
        </p>
      )}
    </TransformEditorShell>
  )
}
