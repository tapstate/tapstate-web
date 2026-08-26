import { Input } from 'antd'
import { GitBranch, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

import type { TransformEditorProps } from './types'

import { TransformEditorShell } from './transform-editor-shell'

export function UnionEditor({ config, onChange }: TransformEditorProps) {
  const { t } = useTranslation()
  const [branches, setBranches] = useState(() =>
    Array.isArray(config.from) ? config.from.map(String) : [''],
  )
  const configurationKey = JSON.stringify(config.from)

  useEffect(() => {
    setBranches(Array.isArray(config.from) ? config.from.map(String) : [''])
  }, [configurationKey])

  function update(nextBranches: string[]) {
    setBranches(nextBranches)
    onChange?.({ from: nextBranches })
  }

  return (
    <TransformEditorShell
      from={config.from}
      icon={GitBranch}
      title={t('pipelines.workspace.transform.union.title')}
      description={t('pipelines.workspace.transform.union.description')}
    >
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
              size="icon-sm"
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
        variant="outline"
        size="sm"
        className="w-fit gap-1.5"
        onClick={() => update([...branches, ''])}
      >
        <Plus className="size-3.5" />
        {t('pipelines.workspace.transform.addBranch')}
      </Button>
    </TransformEditorShell>
  )
}
