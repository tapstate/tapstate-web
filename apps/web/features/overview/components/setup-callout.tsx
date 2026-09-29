import type { ReactNode } from 'react'

import { useTranslation } from 'react-i18next'

interface SetupCalloutProps {
  step: number
  title: string
  description: string
  actions: ReactNode
}

/** The guidance bubble under the block of the current setup step. */
export function SetupCallout({ step, title, description, actions }: SetupCalloutProps) {
  const { t } = useTranslation()
  return (
    <div className="overview-callout" role="note">
      <p className="text-primary-foreground/80 text-[12px] font-medium">
        {t('overview.setup.stepOf', { step, total: 3 })}
      </p>
      <p className="text-[13px] font-semibold">{title}</p>
      <p className="text-primary-foreground/80 text-[12px] leading-relaxed">{description}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">{actions}</div>
    </div>
  )
}
