import { CheckCircle2, Circle, CircleX, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { InitializationProgress } from '@/service/storage-client'

import { Button } from '@/components/ui/button'
import { replaceWithCloudConsole } from '@/utils/cloud-console'

function duration(value: number) {
  const seconds = Math.floor(value / 1000)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = String(seconds % 60).padStart(2, '0')
  return hours
    ? `${hours}:${String(minutes).padStart(2, '0')}:${remainder}`
    : `${minutes}:${remainder}`
}

export function InitializationMilestones({
  progress,
  stale = false,
  waitingForSignIn = false,
}: {
  progress: InitializationProgress
  stale?: boolean
  waitingForSignIn?: boolean
}) {
  const { t } = useTranslation()
  const [now, setNow] = useState(() => performance.now())
  const sample = useRef({ progress, receivedAt: now })
  if (sample.current.progress !== progress)
    sample.current = { progress, receivedAt: performance.now() }
  const frozen = stale || waitingForSignIn
  const running = progress.state === 'RUNNING' && !frozen
  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => setNow(performance.now()), 1000)
    return () => window.clearInterval(timer)
  }, [running, progress.attemptId])
  const elapsedSinceSample = running ? Math.max(0, now - sample.current.receivedAt) : 0
  const completed = progress.milestones.filter((step) => step.state === 'COMPLETE').length
  return (
    <section
      className="border-border rounded-xl border p-4 sm:p-6"
      aria-label={t('storage.initialization.title')}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t('storage.initialization.title')}</h2>
          <p className="text-muted-foreground mt-1 text-sm" role="status">
            {t('storage.initialization.completed', {
              completed,
              total: progress.milestones.length,
            })}
          </p>
        </div>
        <div className="text-muted-foreground text-sm">
          {t('storage.initialization.totalElapsed')}{' '}
          <span className="text-foreground font-mono tabular-nums" aria-live="off">
            {duration(progress.elapsedMillis + elapsedSinceSample)}
          </span>
        </div>
      </div>
      {frozen && (
        <p role="status" className="text-foreground mt-3 text-sm">
          {t(
            waitingForSignIn
              ? 'storage.initialization.updatingSession'
              : 'storage.initialization.stale',
          )}
        </p>
      )}
      <ol className="mt-5" aria-label={t('storage.initialization.steps')}>
        {progress.milestones.map((step, index) => {
          const active = step.state === 'RUNNING'
          const Icon =
            step.state === 'COMPLETE'
              ? CheckCircle2
              : step.state === 'FAILED'
                ? CircleX
                : active
                  ? Loader2
                  : Circle
          return (
            <li
              key={step.id}
              aria-current={active ? 'step' : undefined}
              className="relative flex gap-3 pb-6 last:pb-0"
            >
              {index < progress.milestones.length - 1 && (
                <span
                  aria-hidden="true"
                  className="bg-border absolute top-6 bottom-1 left-2.5 w-px"
                />
              )}
              <Icon
                aria-hidden="true"
                className={`relative mt-0.5 size-5 shrink-0 ${step.state === 'COMPLETE' ? 'text-success' : step.state === 'FAILED' ? 'text-destructive' : active ? 'text-primary' : 'text-muted-foreground'} ${active && !frozen ? 'animate-spin motion-reduce:animate-none' : ''}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h3 className={`text-sm ${active ? 'font-semibold' : 'font-medium'}`}>
                    {t(`storage.initialization.stage.${step.id}`)}
                  </h3>
                  <span
                    className="text-muted-foreground shrink-0 font-mono text-sm tabular-nums"
                    aria-live="off"
                  >
                    {step.elapsedMillis === null
                      ? step.state === 'PENDING'
                        ? '—'
                        : t('storage.initialization.unknownDuration')
                      : duration(step.elapsedMillis + (active ? elapsedSinceSample : 0))}
                  </span>
                </div>
                <p
                  className="text-muted-foreground mt-1 text-xs"
                  role={step.state === 'FAILED' ? 'alert' : undefined}
                >
                  {t(
                    `storage.initialization.state.${frozen && active ? 'LAST_RUNNING' : step.state}`,
                  )}
                </p>
                {active && step.id === 'START_RUNTIME' && (
                  <p className="text-muted-foreground mt-2 text-sm">
                    {t('storage.initialization.runtimeHelp')}
                  </p>
                )}
                {step.errorCode && (
                  <code className="text-destructive mt-2 block text-xs">{step.errorCode}</code>
                )}
              </div>
            </li>
          )
        })}
      </ol>
      {progress.restored && (
        <p className="text-muted-foreground mt-4 text-xs">{t('storage.initialization.restored')}</p>
      )}
      <div className="border-border mt-5 border-t pt-4">
        <p className="text-muted-foreground text-sm">{t('storage.initialization.canLeave')}</p>
        <Button
          className="mt-3 min-h-11 sm:min-h-8"
          variant="outline"
          onClick={() => replaceWithCloudConsole()}
        >
          {t('storage.initialization.backToCloud')}
        </Button>
      </div>
    </section>
  )
}
