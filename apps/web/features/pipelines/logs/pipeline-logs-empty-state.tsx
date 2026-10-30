import type { SVGProps } from 'react'

function WorkflowLogsEmptyMark({ className }: SVGProps<SVGElement>) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M5 6.5V5M8.93934 7.56066L10 6.5M10.0103 11.5H11.5103"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function PipelineLogsEmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <section className="pipeline-logs__state" role="status">
      <div className="pipeline-logs__state-card">
        <h2 className="pipeline-logs__state-title">
          {title}
          <WorkflowLogsEmptyMark className="text-text-secondary relative -top-3 -left-1.5 inline" />
        </h2>
        <p className="pipeline-logs__state-description">{description}</p>
      </div>
    </section>
  )
}
