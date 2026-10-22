import { cva } from 'class-variance-authority'
import { Info, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { CheckList } from '@/components/checks/check-list'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import type { PipelineStartNotice } from './use-start-pipeline'

import { startCheckItem } from './start-check-items'
import { changeLine, decisionLine } from './start-check-model'

const noticeVariants = cva(
  'bg-card text-card-foreground border-border pointer-events-auto grid gap-3 rounded-lg border p-3 text-[13px]',
  {
    variants: {
      placement: {
        inline: '',
        // Over the canvas the notice is a floating surface, so it carries the overlay elevation.
        floating: 'shadow-lg',
      },
    },
    defaultVariants: { placement: 'inline' },
  },
)

const plainText = 'text-foreground font-mono text-xs leading-relaxed break-words'

function noticeTitle(notice: PipelineStartNotice) {
  if (!notice.started) return 'pipelines.startChecks.notice.titleNotStarted'
  return notice.warnings.length > 0
    ? 'pipelines.startChecks.notice.titleWarnings'
    : 'pipelines.startChecks.notice.titleStarted'
}

function PipelineStartNoticePanel({
  notice,
  placement,
  onDismiss,
}: {
  notice: PipelineStartNotice
  placement: 'inline' | 'floating'
  onDismiss: () => void
}) {
  const { t } = useTranslation()
  return (
    <section
      role="status"
      aria-live="polite"
      className={noticeVariants({ placement })}
      data-testid="pipeline-start-notice"
    >
      <div className="flex items-start gap-2">
        <Info className="text-muted-foreground mt-1 size-4 shrink-0" aria-hidden="true" />
        <p className="min-w-0 flex-1 pt-1 font-medium break-words">
          {t(noticeTitle(notice), { id: notice.pipelineId })}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t('pipelines.startChecks.notice.dismiss', { id: notice.pipelineId })}
          onClick={onDismiss}
        >
          <X aria-hidden="true" />
        </Button>
      </div>
      {notice.failure ? (
        <p className="text-destructive leading-relaxed break-words" data-start-notice-failure>
          {notice.failure}
        </p>
      ) : null}
      <CheckList
        groups={[
          {
            id: 'warn',
            title: t('pipelines.startChecks.groups.warn'),
            items: notice.warnings.map((finding) => startCheckItem(finding, t)),
          },
        ]}
      />
      {notice.changes.length > 0 ? (
        <div className="grid gap-1" data-start-notice-changes>
          <p className="text-muted-foreground text-xs font-medium">
            {t('pipelines.startChecks.notice.definitionChanged')}
          </p>
          <ul className="grid">
            {notice.changes.map((change) => (
              <li key={changeLine(change)} className={plainText}>
                {changeLine(change)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {notice.staleDecisions.length > 0 ? (
        <div className="grid gap-1" data-start-notice-stale>
          <p className="text-muted-foreground text-xs font-medium">
            {t('pipelines.startChecks.notice.staleTitle')}
          </p>
          <ul className="grid">
            {notice.staleDecisions.map((decision) => (
              <li key={decisionLine(decision)} className={plainText}>
                {decisionLine(decision)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}

/**
 * What the last starts left for the person to read: warnings, definition changes and answers that
 * were not used. Each notice stays until it is dismissed; nothing here expires on a timer.
 */
export function PipelineStartNotices({
  notices,
  onDismiss,
  placement = 'inline',
  className,
}: {
  notices: readonly PipelineStartNotice[]
  onDismiss: (id: number) => void
  placement?: 'inline' | 'floating'
  className?: string
}) {
  if (notices.length === 0) return null
  return (
    <div className={cn('grid gap-2', className)} data-pipeline-start-notices>
      {notices.map((notice) => (
        <PipelineStartNoticePanel
          key={notice.id}
          notice={notice}
          placement={placement}
          onDismiss={() => onDismiss(notice.id)}
        />
      ))}
    </div>
  )
}
