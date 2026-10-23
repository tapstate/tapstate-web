import { useTranslation } from 'react-i18next'

import type { PipelineTargetIdentity } from '@/service/pipelines/pipeline-client'

interface Props {
  enabled: boolean
  plans?: PipelineTargetIdentity[]
  status: 'idle' | 'loading' | 'stale' | 'complete' | 'error'
}

export function UnwindTargetIdentitySummary({ enabled, plans, status }: Props) {
  const { t } = useTranslation()
  if (!enabled) return null
  const pending = status === 'idle' || status === 'loading' || status === 'stale'
  return (
    <div className="border-border space-y-2 border-b px-4 py-3 text-xs" aria-live="polite">
      <p className="text-foreground font-medium">{t('wizard.targetIdentity.title')}</p>
      {pending || !plans?.length ? (
        <p className="text-muted-foreground" role="status">
          {t(status === 'error' ? 'wizard.targetIdentity.failed' : 'wizard.targetIdentity.pending')}
        </p>
      ) : (
        plans.map((plan) => (
          <div key={`${plan.element}/${plan.stream}/${plan.table}`} className="space-y-1">
            <p className="text-foreground font-medium">
              {plan.connection} / {plan.table}: {t(`wizard.targetIdentity.status.${plan.status}`)}
            </p>
            {plan.status === 'automatic' && (
              <>
                <p>
                  {t('wizard.targetIdentity.automatic', {
                    source: plan.sourceField,
                    preserved: plan.preservedField,
                  })}
                </p>
                <p className="text-muted-foreground">
                  {t('wizard.targetIdentity.generated', {
                    fields: plan.generatedFields.join(', '),
                  })}
                </p>
              </>
            )}
            {plan.status === 'not-required' && <p>{t('wizard.targetIdentity.unchanged')}</p>}
            {plan.status === 'action-required' && (
              <p className="text-destructive" role="alert">
                {t(`wizard.targetIdentity.reasons.${plan.reason}`, {
                  defaultValue: t('wizard.targetIdentity.refused'),
                  field: plan.sourceField,
                  preserved: plan.preservedField,
                })}
              </p>
            )}
            {plan.writeKey.length > 0 && (
              <p className="text-muted-foreground">
                {t('wizard.targetIdentity.writeKey', { key: plan.writeKey.join(' + ') })}
              </p>
            )}
          </div>
        ))
      )}
    </div>
  )
}
