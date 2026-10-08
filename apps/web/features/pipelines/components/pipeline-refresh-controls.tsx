import { Pause, Play, RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
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
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className="relative"
        aria-label={labels.refreshAria}
        title={`${labels.refresh} · ${autoRefresh ? labels.active : labels.paused}`}
        onClick={onRefresh}
        disabled={isFetching}
        data-auto-refresh={autoRefresh ? 'on' : 'off'}
      >
        <RefreshCw className={cn('size-3.5', isFetching && 'animate-spin')} aria-hidden="true" />
        <span
          className={cn(
            'absolute top-1 right-1 size-1.5 rounded-full',
            autoRefresh ? 'bg-primary' : 'bg-muted-foreground',
          )}
          aria-hidden="true"
        />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label={autoRefresh ? labels.pauseAria : labels.resumeAria}
        onClick={onToggle}
      >
        {autoRefresh ? (
          <Pause className="size-3.5" aria-hidden="true" />
        ) : (
          <Play className="size-3.5" aria-hidden="true" />
        )}
        {autoRefresh ? labels.pause : labels.resume}
      </Button>
    </div>
  )
}
