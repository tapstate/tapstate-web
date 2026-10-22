import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import type { StartCheckPlanEntry } from '@/service/pipelines/pipeline-client'

const plainText = 'text-muted-foreground font-mono text-[11px] leading-relaxed break-words'

/** How the start would load each target, with the server's values shown as written. */
export function StartCheckPlan({ plan }: { plan: readonly StartCheckPlanEntry[] }) {
  const { t } = useTranslation()
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="grid gap-2" data-start-check-plan>
      <h3 id={headingId} className="text-muted-foreground text-xs font-medium">
        {t('pipelines.startChecks.plan.title')}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-1 pr-3 font-medium">{t('pipelines.startChecks.plan.target')}</th>
              <th className="py-1 pr-3 font-medium">{t('pipelines.startChecks.plan.load')}</th>
              <th className="py-1 font-medium">{t('pipelines.startChecks.plan.onFullLoad')}</th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {plan.map((entry) => (
              <tr key={`${entry.element}:${entry.target.connection}:${entry.target.table}`}>
                <td className="py-2 pr-3 align-top">
                  <span className="text-foreground block font-medium break-words">
                    {entry.element}
                  </span>
                  <span className={`block ${plainText}`}>
                    {entry.target.connection} / {entry.target.table}
                  </span>
                </td>
                <td className={`py-2 pr-3 align-top ${plainText}`}>{entry.load}</td>
                <td className={`py-2 align-top ${plainText}`}>{entry.onFullLoad}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
