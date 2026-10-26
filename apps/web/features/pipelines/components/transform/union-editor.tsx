import { Button } from '@tapstate-web/ui/button'
import { Input } from '@tapstate-web/ui/input'
import { GitBranch, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { TransformEditorProps } from './types'

import { TransformEditorShell } from './transform-editor-shell'

export function UnionEditor({ config, onChange, upstreamInputs }: TransformEditorProps) {
  const { t } = useTranslation()
  const [branches, setBranches] = useState(() =>
    Array.isArray(config.from) ? config.from.map(String) : [''],
  )
  const configurationKey = JSON.stringify(config.from)
  const configuredBranches = Array.isArray(config.from)
    ? config.from.map(String)
    : typeof config.from === 'string'
      ? [config.from]
      : []
  const inputReferences = upstreamInputs ?? configuredBranches

  useEffect(() => {
    setBranches(Array.isArray(config.from) ? config.from.map(String) : [''])
  }, [configurationKey])

  function update(nextBranches: string[]) {
    setBranches(nextBranches)
    onChange?.({ from: nextBranches })
  }

  return (
    <TransformEditorShell
      from={upstreamInputs === undefined ? config.from : inputReferences}
      icon={GitBranch}
      title={t('pipelines.workspace.transform.union.title')}
    >
      {upstreamInputs !== undefined ? (
        <section className="space-y-2">
          <h4 className="system-sm-semibold text-text-primary">
            {t('pipelines.workspace.transform.wizard.unionStreams')}
          </h4>
          {inputReferences.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {inputReferences.map((input) => (
                <code key={input} className="bg-state-base-hover rounded-md px-2 py-1 text-xs">
                  {input}
                </code>
              ))}
            </div>
          ) : (
            <p className="system-xs-regular text-text-tertiary" role="status">
              {t('pipelines.workspace.transform.noUpstreamInputs')}
            </p>
          )}
          <p className="system-xs-regular text-text-tertiary">
            {t('pipelines.workspace.transform.unionCanvasInputHint')}
          </p>
        </section>
      ) : (
        <>
          <div className="pipeline-transform__branch-list">
            {branches.map((branch, index) => (
              <div key={`${index}-${branch}`} className="pipeline-transform__branch">
                <Input
                  aria-label={t('pipelines.workspace.transform.branch')}
                  value={branch}
                  placeholder={t('pipelines.workspace.transform.branch')}
                  onChange={(event) =>
                    update(
                      branches.map((item, itemIndex) =>
                        itemIndex === index ? event.target.value : item,
                      ),
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="small"
                  className="size-6 p-0"
                  aria-label={t('pipelines.workspace.transform.removeBranch')}
                  onClick={() => {
                    const nextBranches = branches.filter((_, itemIndex) => itemIndex !== index)
                    update(nextBranches.length > 0 ? nextBranches : [''])
                  }}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="secondary"
            size="small"
            className="w-fit gap-1.5"
            onClick={() => update([...branches, ''])}
          >
            <Plus className="size-3.5" />
            {t('pipelines.workspace.transform.addBranch')}
          </Button>
        </>
      )}
    </TransformEditorShell>
  )
}
