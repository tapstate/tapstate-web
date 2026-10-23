import type { MouseEvent } from 'react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@langgenius/dify-ui/dropdown-menu'
import { IconButton } from '@langgenius/dify-ui/icon-button'
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
              <IconButton
                type="button"
                size="md"
                className="rounded-md data-popup-open:bg-state-base-hover"
                aria-label={t('pipelines.workspace.actions.nodeToolbar.more', { node: nodeLabel })}
                data-toolbar-action="more"
              >
                <span className="i-ri-more-fill size-4" aria-hidden="true" />
              </IconButton>
            }
          />
          <DropdownMenuContent
            placement="bottom-end"
            sideOffset={4}
            className="w-auto min-w-40 whitespace-nowrap border-[0.5px] border-components-panel-border bg-components-panel-bg-blur py-1 shadow-lg backdrop-blur-[5px]"
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
              <span className="i-ri-delete-bin-line size-4" aria-hidden="true" />
              {t('pipelines.workspace.actions.nodeToolbar.delete', { node: nodeLabel })}
              <span className="ml-auto pl-4 text-xs text-[var(--pipeline-text-subtle)]">⌫</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
