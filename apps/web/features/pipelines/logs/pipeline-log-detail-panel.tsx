import { DrawerClose, DrawerTitle } from '@tapstate-web/ui/drawer'
import { IconButton } from '@tapstate-web/ui/icon-button'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { PipelineLogLine } from '@/service/pipelines/pipeline-client'

function normalizedLevel(level: string) {
  return level.trim().toUpperCase()
}

export function PipelineLogDetailPanel({ line }: { line: PipelineLogLine }) {
  const { i18n, t } = useTranslation()
  const level = normalizedLevel(line.level)
  const fullTimestamp = new Intl.DateTimeFormat(i18n.language, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  }).format(line.timestampMillis)

  return (
    <aside
      className="pipeline-log-detail"
      aria-label={t('pipelines.workspace.runtime.logs.details')}
    >
      <div className="pipeline-log-detail__header">
        <DrawerTitle className="pipeline-log-detail__title">
          {t('pipelines.workspace.runtime.logs.details')}
        </DrawerTitle>
        <DrawerClose
          render={
            <IconButton
              variant="ghost"
              size="lg"
              aria-label={t('pipelines.workspace.runtime.logs.closeDetailsAria')}
            >
              <X className="size-4" aria-hidden="true" />
            </IconButton>
          }
        />
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
