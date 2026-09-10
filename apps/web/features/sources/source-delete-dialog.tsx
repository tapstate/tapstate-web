import { AlertTriangle, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { SourceView } from '@/service/source-client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { deleteSource, SourceClientError } from '@/service/source-client'
import { useAuthStore } from '@/stores/auth-store'

export function SourceDeleteDialog({
  open,
  source,
  etag,
  onOpenChange,
  onDeleted,
}: {
  open: boolean
  source: SourceView
  etag: string
  onOpenChange: (open: boolean) => void
  onDeleted: () => void
}) {
  const { t } = useTranslation()
  const apiFetch = useAuthStore((state) => state.apiFetch)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<SourceClientError | null>(null)

  async function confirm() {
    setSubmitting(true)
    setError(null)
    try {
      await deleteSource(source.id, etag, apiFetch)
      onDeleted()
      onOpenChange(false)
    } catch (value) {
      setError(value instanceof SourceClientError ? value : null)
    } finally {
      setSubmitting(false)
    }
  }

  const referrers = Array.isArray(error?.params.referrers)
    ? [...error.params.referrers].map(String).sort()
    : []
  const inUse = error?.code === 'source.in-use'

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => (!submitting ? onOpenChange(nextOpen) : undefined)}
    >
      <DialogContent
        closeDisabled={submitting}
        closeLabel={t('ask.actions.close')}
        className="sm:max-w-[480px]"
      >
        <DialogHeader>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <DialogTitle>{t('sources.delete.title', { id: source.id })}</DialogTitle>
          <DialogDescription>{t('sources.delete.body')}</DialogDescription>
        </DialogHeader>
        {error && (
          <div
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-[12px] text-red-800"
            role="alert"
          >
            <p>{inUse ? t('sources.delete.errors.inUse') : t('sources.delete.errors.server')}</p>
            {referrers.length > 0 && (
              <ul className="mt-2 list-disc space-y-0.5 pl-4">
                {referrers.map((referrer) => (
                  <li key={referrer}>{referrer}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            className="h-auto px-3 py-1.5 text-[13px] font-medium"
            onClick={() => onOpenChange(false)}
          >
            {t('sources.delete.cancel')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={submitting}
            className="h-auto px-3 py-1.5 text-[13px] font-medium"
            onClick={() => void confirm()}
          >
            {submitting && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
            {t('sources.delete.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
