import { Code2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Textarea } from '@/components/ui/textarea'

import { TransformEditorShell } from './transform-editor-shell'
import { TransformSelect } from './transform-select'
import { mergeBody, type TransformEditorProps } from './types'

export function JsEditor({ config, onChange }: TransformEditorProps) {
  const { t } = useTranslation()
  const [language, setLanguage] = useState(() =>
    typeof config.body.engine === 'string' ? config.body.engine : 'javascript',
  )
  const [script, setScript] = useState(() =>
    typeof config.body.script === 'string' ? config.body.script : '',
  )
  const configurationKey = JSON.stringify({
    engine: config.body.engine,
    script: config.body.script,
  })

  useEffect(() => {
    setLanguage(typeof config.body.engine === 'string' ? config.body.engine : 'javascript')
    setScript(typeof config.body.script === 'string' ? config.body.script : '')
  }, [configurationKey])

  function updateLanguage(nextLanguage: string) {
    setLanguage(nextLanguage)
    onChange?.({ body: mergeBody(config, { engine: nextLanguage }) })
  }

  return (
    <TransformEditorShell
      from={config.from}
      icon={Code2}
      title={t('pipelines.workspace.transform.js.title')}
    >
      <TransformSelect
        label={t('pipelines.workspace.transform.language')}
        value={language}
        options={[
          { value: 'javascript', label: 'JavaScript' },
          { value: 'typescript', label: 'TypeScript' },
        ]}
        onChange={updateLanguage}
      />
      <Textarea
        aria-label={t('pipelines.workspace.transform.script')}
        value={script}
        rows={10}
        placeholder={t('pipelines.workspace.transform.script')}
        className="pipeline-transform__code-editor"
        onValueChange={(next) => {
          setScript(next)
          onChange?.({ body: mergeBody(config, { script: next, engine: language }) })
        }}
      />
    </TransformEditorShell>
  )
}
