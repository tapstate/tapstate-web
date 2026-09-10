import { AlertCircle, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

import type { PipelineLifecycleAction } from './pipeline-lifecycle-menu'

export function PipelineMutationFeedback({
  pipelineId,
  action,
  message,
  onDismiss,
}: {
  pipelineId: string
  action: PipelineLifecycleAction
  message?: string
  onDismiss: () => void
}) {
  const { t } = useTranslation()

  return (
    <div className="pipeline-mutation-feedback fixed" role="alert" aria-live="assertive">
      <AlertCircle className="pipeline-mutation-feedback__icon" aria-hidden="true" />
      <p className="pipeline-mutation-feedback__message">
        <span className="sr-only">{pipelineId}: </span>
        {message ?? t(`pipelines.lifecycle.${action}Failed`)}
      </p>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="pipeline-mutation-feedback__dismiss"
        aria-label={t('pipelines.lifecycle.dismissFeedback')}
        onClick={onDismiss}
      >
        <X aria-hidden="true" />
      </Button>
    </div>
  )
}
