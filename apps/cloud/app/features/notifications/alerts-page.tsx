import { Tabs, TabsList, TabsTab } from '@tapstate-web/ui/tabs'
import { BellRing } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useCloudAppState } from '../../state/cloud-app-state'
import { AlertPolicyPage } from './alert-policy-page'
import { DeliveryHistoryPage } from './delivery-history-page'
import { EventCenterPage } from './event-center-page'

export type AlertTab = 'events' | 'policies' | 'deliveries'

export interface AlertsPageProps {
  initialTab?: AlertTab
  onTabChange?: (tab: AlertTab) => void
}

export function AlertsPage({ initialTab = 'events', onTabChange }: AlertsPageProps) {
  const { t } = useTranslation()
  const { activeOrganization, user } = useCloudAppState()
  const [activeTab, setActiveTab] = useState<AlertTab>(initialTab)

  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab)
    }
  }, [initialTab])

  const canManageAlertPolicies =
    !activeOrganization?.ownerEmail ||
    (user?.email && activeOrganization.ownerEmail.toLowerCase() === user.email.toLowerCase())

  const handleTabChange = (nextTab: AlertTab) => {
    setActiveTab(nextTab)
    onTabChange?.(nextTab)
  }

  const effectiveTab = activeTab === 'policies' && !canManageAlertPolicies ? 'events' : activeTab

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between border-b border-black/[0.05] px-6 py-4 dark:border-white/[0.05]">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">
            <BellRing className="h-5 w-5 text-neutral-400" />
            {t('sections.alerts.title')}
          </h1>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            {t('events.subtitle', {
              organization: activeOrganization?.name ?? t('events.organizationFallback'),
            })}
          </p>
        </div>
      </header>

      <div className="shrink-0 border-b border-black/[0.05] px-6 pt-3 dark:border-white/[0.05]">
        <Tabs value={effectiveTab} onValueChange={(val) => handleTabChange(val as AlertTab)}>
          <TabsList aria-label={t('sections.alerts.title')}>
            <TabsTab value="events">{t('events.tabEvents')}</TabsTab>
            {canManageAlertPolicies && (
              <TabsTab value="policies">{t('events.tabPolicies')}</TabsTab>
            )}
            <TabsTab value="deliveries">{t('events.tabDeliveries')}</TabsTab>
          </TabsList>
        </Tabs>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {effectiveTab === 'events' && <EventCenterPage embedded />}
        {effectiveTab === 'policies' && <AlertPolicyPage embedded />}
        {effectiveTab === 'deliveries' && <DeliveryHistoryPage embedded />}
      </div>
    </div>
  )
}
