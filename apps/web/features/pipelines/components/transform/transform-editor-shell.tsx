import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { useTranslation } from 'react-i18next'

function inputReferences(value: unknown) {
  const items = Array.isArray(value) ? value : value === undefined || value === null ? [] : [value]
  return items
    .map((item) => (typeof item === 'string' ? item : JSON.stringify(item)))
    .filter(Boolean)
}

export function TransformEditorShell({
  icon: Icon,
  title,
  from,
  children,
}: {
  icon: LucideIcon
  title: string
  from?: unknown
  children: ReactNode
}) {
  const { t } = useTranslation()
  const inputs = inputReferences(from)

  return (
    <section className="pipeline-transform">
      <div className="pipeline-transform__intro">
        <span className="pipeline-transform__icon" aria-hidden="true">
          <Icon className="size-4" />
        </span>
        <h3>{title}</h3>
      </div>
      <div
        className="pipeline-transform__inputs"
        aria-label={t('pipelines.workspace.transform.inputs')}
      >
        <span className="pipeline-transform__inputs-label">
          {t('pipelines.workspace.transform.inputs')}
        </span>
        {inputs.length > 0 ? (
          inputs.map((input) => <code key={input}>{input}</code>)
        ) : (
          <span className="pipeline-transform__inputs-empty">
            {t('pipelines.workspace.transform.inputsEmpty')}
          </span>
        )}
      </div>
      <div className="pipeline-transform__body">{children}</div>
    </section>
  )
}
