import type { ReactNode } from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { I18nextProvider, useTranslation } from 'react-i18next'

import { DialogProvider } from '@/components/ui/dialog'
import { ToastProvider } from '@/components/ui/toast'
import { i18n } from '@/i18n'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  )

  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <LocalizedUIProviders>{children}</LocalizedUIProviders>
      </QueryClientProvider>
    </I18nextProvider>
  )
}

function LocalizedUIProviders({ children }: { children: ReactNode }) {
  const { t } = useTranslation()

  return (
    <DialogProvider closeLabel={t('common.close')}>
      <ToastProvider closeLabel={t('common.close')}>{children}</ToastProvider>
    </DialogProvider>
  )
}
