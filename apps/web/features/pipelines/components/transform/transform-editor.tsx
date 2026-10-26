import { Textarea } from '@tapstate-web/ui/textarea'
import { Code2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { TransformEditorProps } from './types'

import { getPipelineTransformDefinition } from './registry'
import { TransformEditorShell } from './transform-editor-shell'

export function TransformEditor({
  config,
  onChange,
  fieldTypes,
  upstreamInputs,
}: TransformEditorProps) {
  const definition = getPipelineTransformDefinition(config.transformType)
  if (definition) {
    const Editor = definition.editor
    return (
      <Editor
        config={config}
        onChange={onChange}
        fieldTypes={fieldTypes}
        upstreamInputs={upstreamInputs}
      />
    )
  }
  return <UnknownTransformEditor config={config} onChange={onChange} title={config.transformType} />
}

function UnknownTransformEditor({
  config,
  onChange,
  title,
}: TransformEditorProps & { title: string }) {
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
    <TransformEditorShell from={config.from} icon={Code2} title={title}>
      <Textarea
        value={raw}
        onValueChange={updateRaw}
        rows={9}
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
