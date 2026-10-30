import type { MouseEvent } from 'react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@tapstate-web/ui/dropdown-menu'
import { IconButton } from '@tapstate-web/ui/icon-button'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

interface PipelineNodeToolbarProps {
  nodeLabel: string
  visible: boolean
  onRequestDelete?: () => void
}

/**
 * source-matched action bar for a selected node.
 *
 * The source-matched outer wrapper owns positioning and visibility. The inner
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
                className="hover:bg-pipeline-actionbar-bg-accent data-popup-open:bg-state-base-hover h-5! w-5! rounded-md border-0 p-0 hover:text-[var(--pipeline-text)] focus-visible:ring-[var(--pipeline-selection)]"
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
            className="border-components-panel-border bg-components-panel-bg-blur w-auto min-w-40 border-[0.5px] py-1 whitespace-nowrap shadow-lg backdrop-blur-[5px]"
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
