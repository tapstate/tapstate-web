import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogCancelButton,
  AlertDialogConfirmButton,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@tapstate-web/ui/alert-dialog'
import { LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { SourceView } from '@/service/source-client'

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
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => (!submitting ? onOpenChange(nextOpen) : undefined)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('sources.delete.title', { id: source.id })}</AlertDialogTitle>
          <AlertDialogDescription>{t('sources.delete.body')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogBody>
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
        </AlertDialogBody>
        <AlertDialogFooter>
          <AlertDialogCancelButton type="button" variant="secondary" disabled={submitting}>
            {t('sources.delete.cancel')}
          </AlertDialogCancelButton>
          <AlertDialogConfirmButton
            type="button"
            disabled={submitting}
            onClick={() => void confirm()}
          >
            {submitting && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
            {t('sources.delete.confirm')}
          </AlertDialogConfirmButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
