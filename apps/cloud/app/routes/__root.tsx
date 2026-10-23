import { createRootRoute, Outlet } from '@tanstack/react-router'
import { DialogProvider, ToastProvider } from '@tapstate-web/ui'
import { useTranslation } from 'react-i18next'

import { CloudAppStateProvider } from '../state/cloud-app-state'

function RootRoute() {
  const { t } = useTranslation()

  return (
    <DialogProvider closeLabel={t('common.close')}>
      <ToastProvider closeLabel={t('common.close')}>
        <CloudAppStateProvider>
          <Outlet />
        </CloudAppStateProvider>
      </ToastProvider>
    </DialogProvider>
  )
}

export const Route = createRootRoute({ component: RootRoute })
