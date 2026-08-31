import { X } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import type { PipelineLogLine } from '@/service/pipelines/pipeline-client'

import { Button } from '@/components/ui/button'

function normalizedLevel(level: string) {
  return level.trim().toUpperCase()
}

export function PipelineLogDetailPanel({
  line,
  onClose,
}: {
  line: PipelineLogLine
  onClose: () => void
}) {
  const { i18n, t } = useTranslation()
  const level = normalizedLevel(line.level)
  const fullTimestamp = new Intl.DateTimeFormat(i18n.language, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(line.timestampMillis)

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return (
    <aside
      className="pipeline-log-detail"
      aria-label={t('pipelines.workspace.runtime.logs.details')}
    >
      <div className="pipeline-log-detail__header">
        <h2 className="pipeline-log-detail__title">
          {t('pipelines.workspace.runtime.logs.details')}
        </h2>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('pipelines.workspace.runtime.logs.closeDetailsAria')}
          onClick={onClose}
        >
          <X className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <dl className="pipeline-log-detail__metadata">
        <div className="pipeline-log-detail__metadata-item">
          <dt>{t('pipelines.workspace.runtime.logs.level')}</dt>
          <dd className="pipeline-logs__level" data-level={level}>
            {level}
          </dd>
        </div>
        <div className="pipeline-log-detail__metadata-item">
          <dt>{t('pipelines.workspace.runtime.logs.fullTimestamp')}</dt>
          <dd>
            <time dateTime={new Date(line.timestampMillis).toISOString()}>{fullTimestamp}</time>
          </dd>
        </div>
      </dl>

      <div className="pipeline-log-detail__message">
        <p className="pipeline-log-detail__message-label">
          {t('pipelines.workspace.runtime.logs.message')}
        </p>
        <pre>{line.message}</pre>
      </div>
    </aside>
  )
}
