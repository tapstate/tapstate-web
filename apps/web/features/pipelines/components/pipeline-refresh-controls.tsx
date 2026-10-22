import { IconButton } from '@langgenius/dify-ui/icon-button'
import { Pause, Play, RefreshCw } from 'lucide-react'

import { Button } from '@langgenius/dify-ui/button'
import { cn } from '@/lib/utils'

export const PIPELINE_AUTO_REFRESH_INTERVAL_MS = 5_000

export interface PipelineRefreshControlLabels {
  refresh: string
  refreshAria: string
  active: string
  paused: string
  pause: string
  pauseAria: string
  resume: string
  resumeAria: string
}

export function PipelineRefreshControls({
  autoRefresh,
  isFetching,
  labels,
  onRefresh,
  onToggle,
}: {
  autoRefresh: boolean
  isFetching: boolean
  labels: PipelineRefreshControlLabels
  onRefresh: () => void
  onToggle: () => void
}) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <IconButton
        type="button"
        variant="secondary"
        size="lg"
        className="relative"
        aria-label={labels.refreshAria}
        title={`${labels.refresh} · ${autoRefresh ? labels.active : labels.paused}`}
        onClick={onRefresh}
        disabled={isFetching}
        data-auto-refresh={autoRefresh ? 'on' : 'off'}
      >
        <span
          className="relative inline-flex size-full items-center justify-center"
          aria-hidden="true"
        >
          <RefreshCw className={cn('size-4', isFetching && 'animate-spin')} />
          <span
            className={cn(
              'absolute top-0.5 right-0.5 size-1.5 rounded-full',
              autoRefresh ? 'bg-primary' : 'bg-muted-foreground',
            )}
          />
        </span>
      </IconButton>
      <Button
        type="button"
        variant="secondary"
        size="medium"
        aria-label={autoRefresh ? labels.pauseAria : labels.resumeAria}
        onClick={onToggle}
      >
        {autoRefresh ? (
          <Pause className="size-4" aria-hidden="true" />
        ) : (
          <Play className="size-4" aria-hidden="true" />
        )}
        {autoRefresh ? labels.pause : labels.resume}
      </Button>
    </div>
  )
}
