import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth-store'

/** An unavailable authority remains recoverable rather than pretending the session ended. */
export function SessionRecovery() {
  const { t } = useTranslation()
  const status = useAuthStore((state) => state.status)
  const restore = useAuthStore((state) => state.restore)
  if (status === 'checking') return <p role="status">{t('state.loading')}</p>
  return (
    <div role="alert">
      <p>{t('auth.login.errors.network')}</p>
      <Button
        onClick={() => {
          void restore().catch(() => undefined)
        }}
      >
        {t('state.error.retry')}
      </Button>
    </div>
  )
}
