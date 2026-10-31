import { createFileRoute } from '@tanstack/react-router'

import { AlertsPage, type AlertSearch } from '@/features/alerts/alerts-page'
export const Route = createFileRoute('/_authenticated/alerts')({
  component: AlertsPage,
  validateSearch: (input: Record<string, unknown>): AlertSearch => ({
    endReason: typeof input.endReason === 'string' ? input.endReason : undefined,
    severity: typeof input.severity === 'string' ? input.severity : undefined,
    q: typeof input.q === 'string' ? input.q : undefined,
    alarm: typeof input.alarm === 'string' ? input.alarm : undefined,
    alarmEpisode:
      Number.isSafeInteger(Number(input.alarmEpisode)) && Number(input.alarmEpisode) > 0
        ? Number(input.alarmEpisode)
        : undefined,
    view: ['active', 'history', 'deliveries'].includes(String(input.view))
      ? (input.view as AlertSearch['view'])
      : undefined,
    key: typeof input.key === 'string' ? input.key : undefined,
    episode:
      Number.isSafeInteger(Number(input.episode)) && Number(input.episode) > 0
        ? Number(input.episode)
        : undefined,
    channel: typeof input.channel === 'string' ? input.channel : undefined,
    result: typeof input.result === 'string' ? input.result : undefined,
    delivery: typeof input.delivery === 'string' ? input.delivery : undefined,
  }),
})
