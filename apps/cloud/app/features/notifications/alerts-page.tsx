import { Tabs, TabsList, TabsTab } from '@tapstate-web/ui/tabs'
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
      <header className="border-divider-subtle flex shrink-0 items-center justify-between gap-4 border-b px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">
            {t('sections.alerts.title')}
          </h1>
          <p className="body-sm-regular text-text-tertiary mt-1">
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
