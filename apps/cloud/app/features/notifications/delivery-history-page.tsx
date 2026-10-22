import { Inbox } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { NotificationDelivery } from '../../service/cloud-api'

import { cloudApi } from '../../service/cloud-api'
import { useCloudAppState } from '../../state/cloud-app-state'

function statusClass(status: NotificationDelivery['status']) {
  if (status === 'SENT') return 'bg-emerald-500'
  if (status === 'DEAD') return 'bg-red-500'
  if (status === 'FAILED') return 'bg-amber-500'
  return 'bg-neutral-400'
}

function formatTime(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

export function DeliveryHistoryPage() {
  const { t } = useTranslation()
  const { activeOrganization } = useCloudAppState()
  const organizationId = activeOrganization?.id
  const [deliveries, setDeliveries] = useState<NotificationDelivery[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    if (!organizationId) return
    let active = true
    setIsLoading(true)
    setHasError(false)
    void cloudApi
      .deliveries(organizationId)
      .then((rows) => {
        if (active) setDeliveries(rows)
      })
      .catch(() => {
        if (active) setHasError(true)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [organizationId])

  return (
    <div className="flex h-full flex-1 flex-col overflow-y-auto">
      <header className="flex shrink-0 items-center justify-between border-b border-black/[0.05] px-6 py-4 dark:border-white/[0.05]">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">
            <Inbox className="h-5 w-5 text-neutral-400" />
            {t('events.tabDeliveries')}
          </h1>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            {t('events.deliverySubtitle', {
              organization: activeOrganization?.name ?? t('events.organizationFallback'),
            })}
          </p>
        </div>
      </header>

      <div className="p-6">
        {isLoading ? (
          <p className="text-xs text-neutral-500">{t('events.loading')}</p>
        ) : hasError ? (
          <p className="text-xs text-red-600 dark:text-red-400">{t('events.loadError')}</p>
        ) : deliveries.length === 0 ? (
          <p className="text-xs text-neutral-500">{t('events.empty')}</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-black/[0.06] dark:border-white/[0.06]">
            <table className="w-full table-fixed text-left text-xs">
              <thead className="bg-black/[0.02] text-[10px] tracking-wider text-neutral-400 uppercase dark:bg-white/[0.03]">
                <tr>
                  <th className="w-40 px-3 py-2 font-medium">{t('events.columns.time')}</th>
                  <th className="w-56 px-3 py-2 font-medium">{t('events.columns.recipient')}</th>
                  <th className="w-24 px-3 py-2 font-medium">{t('events.columns.status')}</th>
                  <th className="w-20 px-3 py-2 font-medium">{t('events.columns.attempts')}</th>
                  <th className="px-3 py-2 font-medium">{t('events.columns.subject')}</th>
                  <th className="w-64 px-3 py-2 font-medium">{t('events.columns.lastError')}</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((delivery) => (
                  <tr
                    className="border-t border-black/[0.05] dark:border-white/[0.05]"
                    key={delivery.id}
                  >
                    <td className="px-3 py-2 font-mono text-[11px] text-neutral-500">
                      {formatTime(delivery.createdAt)}
                    </td>
                    <td className="truncate px-3 py-2">{delivery.recipient}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${statusClass(delivery.status)}`}
                        />
                        {t(`events.status.${delivery.status}`)}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px]">{delivery.attempts}</td>
                    <td className="truncate px-3 py-2 text-neutral-700 dark:text-neutral-200">
                      {delivery.subject}
                    </td>
                    <td className="truncate px-3 py-2 text-neutral-500">
                      {delivery.lastError ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
