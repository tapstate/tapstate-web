import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { cloudApi, type Subscription } from '../../service/cloud-api'
import { useCloudAppState } from '../../state/cloud-app-state'
import { CloudOverviewView } from './cloud-overview-view'

function statusLabel(status: string) {
  return status
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function OverviewPage() {
  const navigate = useNavigate()
  const { activeOrganization, clusters } = useCloudAppState()
  const [subscription, setSubscription] = useState<Subscription | null>(null)

  useEffect(() => {
    setSubscription(null)
    if (!activeOrganization) return
    let current = true
    void cloudApi
      .subscription(activeOrganization.id)
      .then((value) => {
        if (current) setSubscription(value)
      })
      .catch(() => {
        if (current) setSubscription(null)
      })
    return () => {
      current = false
    }
  }, [activeOrganization?.id])

  return (
    <CloudOverviewView
      organization={activeOrganization}
      subscriptionLabel={subscription ? statusLabel(subscription.status) : undefined}
      clusters={clusters}
      onNavigate={() => void navigate({ to: '/clusters' })}
      onOpenProvisionModal={() => void navigate({ to: '/onboarding' })}
    />
  )
}
