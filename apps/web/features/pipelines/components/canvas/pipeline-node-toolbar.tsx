import type { MouseEvent } from 'react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@langgenius/dify-ui/dropdown-menu'
import { MoreHorizontal, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

interface PipelineNodeToolbarProps {
  nodeLabel: string
  visible: boolean
  onRequestDelete?: () => void
}

/**
 * Dify-style action bar for a selected node.
 *
 * The Dify-style outer wrapper owns positioning and visibility. The inner
 * action bar is an interaction island, so node dragging and canvas panning
 * never compete with the delete button.
 */
export function PipelineNodeToolbar({
  nodeLabel,
  visible,
  onRequestDelete,
}: PipelineNodeToolbarProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  function stopPropagation(event: MouseEvent<HTMLDivElement>) {
    event.stopPropagation()
  }

  return (
    <div
      className={cn(
        'pipeline-canvas__node-toolbar invisible absolute -top-7 right-0 flex h-7 pb-1 group-hover:visible has-data-popup-open:visible',
        visible && 'visible',
      )}
    >
      <div
        className="nodrag nopan nowheel border-pipeline-actionbar-border bg-pipeline-actionbar-bg flex h-6 items-center rounded-lg border-[0.5px] px-0.5 text-[var(--pipeline-control-icon)] shadow-md backdrop-blur-[5px]"
        role="toolbar"
        aria-label={t('pipelines.workspace.actions.nodeToolbar.label', { node: nodeLabel })}
        onPointerDown={stopPropagation}
        onMouseDown={stopPropagation}
        onClick={stopPropagation}
      >
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="hover:bg-pipeline-actionbar-bg-accent data-popup-open:bg-pipeline-actionbar-bg-accent flex size-6 h-5! w-5! cursor-pointer items-center justify-center rounded-md border-0 bg-transparent p-0 text-inherit transition-colors hover:text-[var(--pipeline-text)] focus-visible:ring-1 focus-visible:ring-[var(--pipeline-selection)] focus-visible:outline-hidden"
                aria-label={t('pipelines.workspace.actions.nodeToolbar.more', { node: nodeLabel })}
                title={t('pipelines.workspace.actions.nodeToolbar.more', { node: nodeLabel })}
                data-toolbar-action="more"
              >
                <MoreHorizontal className="size-4" aria-hidden="true" />
              </button>
            }
          />
          <DropdownMenuContent
            placement="bottom-end"
            sideOffset={4}
            className="w-auto min-w-40 whitespace-nowrap"
          >
            <DropdownMenuItem
              variant="destructive"
              disabled={!onRequestDelete}
              data-toolbar-action="delete"
              onClick={(event) => {
                event.stopPropagation()
                onRequestDelete?.()
              }}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              {t('pipelines.workspace.actions.nodeToolbar.delete', { node: nodeLabel })}
              <span className="ml-auto pl-4 text-xs text-[var(--pipeline-text-subtle)]">⌫</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
