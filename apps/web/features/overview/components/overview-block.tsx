import type { ComponentType, ReactNode, SVGProps } from 'react'

import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

export interface OverviewBlockDetail {
  label: string
  value: ReactNode
}

interface OverviewBlockProps {
  title: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  /** The count line, such as "2 sources". */
  metric: string
  details: OverviewBlockDetail[]
  /** Shown in place of the details while the block has nothing yet, such as an Add button. */
  emptyAction?: ReactNode
  footer: ReactNode
  /** Setup step number shown while guidance is on; null hides it. */
  step: number | null
  stepDone: boolean
  current: boolean
  /** Number of problems in this block, shown as a badge when above zero. */
  problems: number
  problemTone: 'warning' | 'destructive'
  callout?: ReactNode
}

/** One block of the overview flow. Every block has the same four rows so the three line up. */
export function OverviewBlock({
  title,
  icon: Icon,
  metric,
  details,
  emptyAction,
  footer,
  step,
  stepDone,
  current,
  problems,
  problemTone,
  callout,
}: OverviewBlockProps) {
  const { t } = useTranslation()
  return (
    <div className="overview-block-slot">
      <section
        className={cn('overview-block', current && 'overview-block--current')}
        aria-label={title}
        aria-current={current ? 'step' : undefined}
      >
        <header className="overview-block__title">
          {step !== null && (
            <span
              className={cn('overview-block__step', stepDone && 'overview-block__step--done')}
              aria-label={
                stepDone
                  ? t('overview.setup.stepDone', { step })
                  : t('overview.setup.stepNumber', { step })
              }
            >
              {stepDone ? <Check className="h-3 w-3" aria-hidden="true" /> : step}
            </span>
          )}
          <Icon className="text-muted-foreground h-4 w-4 shrink-0" aria-hidden="true" />
          <h2 className="text-foreground min-w-0 truncate text-[13px] font-semibold">{title}</h2>
          {problems > 0 && (
            <span
              className={cn('overview-block__problems', `overview-block__problems--${problemTone}`)}
              aria-label={t('overview.problems', { count: problems })}
            >
              {problems}
            </span>
          )}
        </header>
        <p className="overview-block__metric">{metric}</p>
        {emptyAction ? (
          <div className="overview-block__details overview-block__empty">{emptyAction}</div>
        ) : (
          <dl className="overview-block__details">
            {details.map((detail) => (
              <div key={detail.label} className="overview-block__detail">
                <dt>{detail.label}</dt>
                <dd>{detail.value}</dd>
              </div>
            ))}
          </dl>
        )}
        <footer className="overview-block__footer">{footer}</footer>
      </section>
      {callout}
    </div>
  )
}
