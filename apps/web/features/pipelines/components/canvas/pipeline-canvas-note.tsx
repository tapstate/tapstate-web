import type { NodeProps } from '@xyflow/react'

import { Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { CanvasNode } from './pipeline-canvas-types'

export function PipelineCanvasNote({ id, data, selected }: NodeProps<CanvasNode>) {
  const { t } = useTranslation()
  return (
    <div className="pipeline-canvas__note group" data-selected={selected || undefined}>
      <div className="pipeline-canvas__note-header" />
      {selected && !data.noteReadOnly && (
        <button
          type="button"
          className="pipeline-canvas__note-delete nodrag nopan flex size-6 items-center justify-center rounded-md"
          aria-label={t('pipelines.workspace.actions.deleteNote')}
          onClick={(event) => {
            event.stopPropagation()
            data.onNoteDelete?.(id)
          }}
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
        </button>
      )}
      <textarea
        className="nodrag nowheel pipeline-canvas__note-input"
        aria-label={t('pipelines.workspace.actions.noteText')}
        placeholder={t('pipelines.workspace.actions.notePlaceholder')}
        value={data.noteText ?? ''}
        readOnly={data.noteReadOnly}
        onChange={(event) => data.onNoteChange?.(id, event.target.value)}
      />
    </div>
  )
}
