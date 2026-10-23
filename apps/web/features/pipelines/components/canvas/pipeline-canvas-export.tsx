import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuGroupLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@langgenius/dify-ui/dropdown-menu'
import { IconButton } from '@langgenius/dify-ui/icon-button'
import { getNodesBounds, useReactFlow } from '@xyflow/react'
import { toJpeg, toPng, toSvg } from 'html-to-image'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { PipelineCanvasTooltip } from './pipeline-canvas-tooltip'

type ImageFormat = 'png' | 'jpeg' | 'svg'

const imageMethods = { png: toPng, jpeg: toJpeg, svg: toSvg }

export function PipelineCanvasExport({ disabled = false }: { disabled?: boolean }) {
  const { t } = useTranslation()
  const flow = useReactFlow()
  const [exporting, setExporting] = useState(false)

  async function exportImage(format: ImageFormat, wholePipeline: boolean) {
    const viewport = document.querySelector<HTMLElement>(
      '.pipeline-workspace .react-flow__viewport',
    )
    if (!viewport || exporting) return

    setExporting(true)
    try {
      const canvas = viewport.closest<HTMLElement>('.pipeline-canvas')
      const options = wholePipeline
        ? (() => {
            const bounds = getNodesBounds(flow.getNodes())
            const padding = 50
            return {
              width: bounds.width + padding * 2,
              height: bounds.height + padding * 2,
              style: {
                width: `${bounds.width + padding * 2}px`,
                height: `${bounds.height + padding * 2}px`,
                transform: `translate(${padding - bounds.x}px, ${padding - bounds.y}px)`,
                transformOrigin: 'top left',
              },
            }
          })()
        : undefined
      const dataUrl = await imageMethods[format](viewport, {
        ...options,
        backgroundColor: canvas ? getComputedStyle(canvas).backgroundColor : undefined,
        pixelRatio: 2,
        filter: (node) => !(node instanceof HTMLImageElement) || node.complete,
      })
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `pipeline-${wholePipeline ? 'whole' : 'view'}.${format}`
      link.click()
    } catch (error) {
      console.error('Export image failed:', error)
    } finally {
      setExporting(false)
    }
  }

  return (
    <DropdownMenu disabled={disabled || exporting}>
      <PipelineCanvasTooltip label={t('pipelines.workspace.actions.exportImage')}>
        <DropdownMenuTrigger
          render={
            <IconButton
              type="button"
              size="lg"
              className="pipeline-canvas__tool-button data-pressed:bg-state-base-hover data-pressed:text-text-secondary"
              aria-label={t('pipelines.workspace.actions.exportImage')}
            >
              <span className="i-ri-export-line size-4" aria-hidden="true" />
            </IconButton>
          }
        />
      </PipelineCanvasTooltip>
      <DropdownMenuContent placement="right-end" className="min-w-45">
        <DropdownMenuGroup>
          <DropdownMenuGroupLabel>
            {t('pipelines.workspace.actions.currentView')}
          </DropdownMenuGroupLabel>
          {(['png', 'jpeg', 'svg'] as const).map((format) => (
            <DropdownMenuItem
              className="system-md-regular"
              key={format}
              onClick={() => void exportImage(format, false)}
            >
              {t('pipelines.workspace.actions.exportFormat', { format: format.toUpperCase() })}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="mx-2" />
        <DropdownMenuGroup>
          <DropdownMenuGroupLabel>
            {t('pipelines.workspace.actions.wholePipeline')}
          </DropdownMenuGroupLabel>
          {(['png', 'jpeg', 'svg'] as const).map((format) => (
            <DropdownMenuItem
              className="system-md-regular"
              key={format}
              onClick={() => void exportImage(format, true)}
            >
              {t('pipelines.workspace.actions.exportFormat', { format: format.toUpperCase() })}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
