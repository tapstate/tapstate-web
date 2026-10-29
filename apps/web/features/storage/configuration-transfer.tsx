import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  storageRequest,
  StorageClientError,
  type ImportPreflight,
  type ImportReceipt,
  type ImportStatus,
} from '@/service/storage-client'

import { useStorage } from './storage-context'
import { splitIds } from './storage-recovery'
import { inputClass, StorageError } from './storage-ui'
import { useStorageAction } from './use-storage-action'

export function ConfigurationTransfer({ defaultSourceId }: { defaultSourceId?: string }) {
  const { t } = useTranslation()
  const { snapshot, fetcher, refresh } = useStorage()
  const action = useStorageAction()
  const [resourceIds, setResourceIds] = useState('')
  const [usernames, setUsernames] = useState('')
  const [key, setKey] = useState('')
  const [transfer, setTransfer] = useState('')
  const [sourceDefault, setSourceDefault] = useState('')
  const [preflight, setPreflight] = useState<ImportPreflight | null>(null)
  const [importId, setImportId] = useState('')
  const [status, setStatus] = useState<ImportStatus | null>(null)
  const [pendingResult, setPendingResult] = useState(false)
  const [commitRefused, setCommitRefused] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  if (!snapshot) return null
  const mapping = sourceDefault && defaultSourceId ? { [sourceDefault]: defaultSourceId } : {}
  const canImport = snapshot.allowedActions.includes('configuration.import.preflight')
  function changed() {
    setCommitRefused(false)
    setPreflight(null)
    setConfirmed(false)
    setStatus(null)
    action.reset()
  }
  return (
    <details className="border-border rounded-lg border p-4">
      <summary className="cursor-pointer text-base font-semibold">
        <h2 className="inline">{t('storage.transfer.title')}</h2>
      </summary>
      <div className="space-y-4 pt-4">
        <p className="text-muted-foreground text-sm">{t('storage.transfer.help')}</p>
        <label className="block space-y-1 text-sm">
          <span>{t('storage.transfer.key')}</span>
          <input
            type="password"
            autoComplete="off"
            className={inputClass}
            value={key}
            disabled={action.busy || pendingResult}
            onChange={(e) => {
              setKey(e.target.value)
              changed()
            }}
          />
        </label>
        <details className="space-y-3">
          <summary className="cursor-pointer text-sm font-medium">
            {t('storage.transfer.export')}
          </summary>
          <label className="block space-y-1 text-sm">
            <span>{t('storage.resourceIds')}</span>
            <input
              className={inputClass}
              value={resourceIds}
              onChange={(e) => setResourceIds(e.target.value)}
            />
          </label>
          {snapshot.mode === 'OP' && (
            <label className="block space-y-1 text-sm">
              <span>{t('storage.transfer.users')}</span>
              <input
                className={inputClass}
                value={usernames}
                onChange={(e) => setUsernames(e.target.value)}
              />
            </label>
          )}
          <Button
            className="min-h-11 sm:min-h-8"
            type="button"
            variant="outline"
            disabled={
              action.busy ||
              !key ||
              !snapshot.allowedActions.includes('configuration.export') ||
              (!resourceIds.trim() && !usernames.trim())
            }
            onClick={() =>
              void action.run(
                () =>
                  storageRequest<{ transfer: string; defaultSourceId: string | null }>(
                    fetcher,
                    'configuration.export',
                    {
                      resourceIds: splitIds(resourceIds),
                      usernames: snapshot.mode === 'OP' ? splitIds(usernames) : [],
                      transferKey: key,
                    },
                  ),
                (result) => {
                  const url = URL.createObjectURL(
                    new Blob([JSON.stringify(result)], { type: 'application/json' }),
                  )
                  const link = document.createElement('a')
                  link.href = url
                  link.download = 'tapstate-configuration.json'
                  link.click()
                  URL.revokeObjectURL(url)
                },
              )
            }
          >
            {t('storage.transfer.download')}
          </Button>
        </details>
        {canImport && (
          <div className="border-border space-y-3 border-t pt-4">
            <h3 className="text-sm font-medium">{t('storage.transfer.import')}</h3>
            <label className="block space-y-1 text-sm">
              <span>{t('storage.transfer.file')}</span>
              <input
                type="file"
                accept="application/json,.json"
                className={inputClass}
                disabled={action.busy || pendingResult}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  changed()
                  setTransfer('')
                  setSourceDefault('')
                  if (!file) return
                  void action.run(
                    async () => {
                      if (file.size > 9 * 1024 * 1024) throw new Error('Input limit')
                      const value = JSON.parse(await file.text()) as {
                        transfer: string
                        defaultSourceId: string | null
                      }
                      if (
                        typeof value.transfer !== 'string' ||
                        (value.defaultSourceId !== null &&
                          typeof value.defaultSourceId !== 'string')
                      )
                        throw new Error('Invalid transfer')
                      return value
                    },
                    (value) => {
                      setTransfer(value.transfer)
                      setSourceDefault(value.defaultSourceId ?? '')
                    },
                  )
                }}
              />
            </label>
            <p className="text-muted-foreground text-sm">
              {t('storage.transfer.mapping', {
                source: sourceDefault || '—',
                destination: defaultSourceId || '—',
              })}
            </p>
            <Button
              className="min-h-11 sm:min-h-8"
              type="button"
              variant="outline"
              disabled={
                !transfer ||
                !key ||
                action.busy ||
                pendingResult ||
                Boolean(sourceDefault && !defaultSourceId)
              }
              onClick={() =>
                void action.run(
                  () =>
                    storageRequest<ImportPreflight>(fetcher, 'configuration.import.preflight', {
                      transfer,
                      transferKey: key,
                      defaultSourceMapping: mapping,
                    }),
                  (result) => {
                    setPreflight(result)
                    setImportId(result.operation.ticket!.id)
                    setStatus(result.operation)
                    setConfirmed(false)
                  },
                )
              }
            >
              {t('storage.transfer.preflight')}
            </Button>
            {preflight && !pendingResult && (
              <>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                  <span>{t('storage.transfer.confirmHelp')}</span>
                </label>
                <Button
                  className="min-h-11 sm:min-h-8"
                  type="button"
                  disabled={!confirmed || action.busy}
                  onClick={() => {
                    setPendingResult(true)
                    setCommitRefused(false)
                    void action.run(
                      () =>
                        storageRequest<ImportReceipt>(fetcher, 'configuration.import.commit', {
                          importId,
                          transfer: preflight.preparedTransfer,
                          transferKey: key,
                          defaultSourceMapping: mapping,
                        }),
                      async (receipt) => {
                        setStatus({
                          phase: 'COMMITTED',
                          ticket: preflight.operation.ticket,
                          receipt,
                        })
                        setTransfer('')
                        setPreflight(null)
                        setKey('')
                        setConfirmed(false)
                        setPendingResult(false)
                        await refresh(true)
                      },
                      (failure) =>
                        setCommitRefused(
                          failure instanceof StorageClientError &&
                            failure.status === 409 &&
                            failure.code === 'io.configuration-import-refused',
                        ),
                    )
                  }}
                >
                  {t('storage.transfer.commit')}
                </Button>
              </>
            )}
          </div>
        )}
        <label className="block space-y-1 text-sm">
          <span>{t('storage.operationId')}</span>
          <input
            className={inputClass}
            value={importId}
            disabled={pendingResult || action.busy}
            onChange={(e) => {
              setImportId(e.target.value)
              changed()
            }}
          />
        </label>
        <p className="text-muted-foreground text-sm">{t('storage.originalResultHelp')}</p>
        <Button
          className="min-h-11 sm:min-h-8"
          type="button"
          variant="outline"
          disabled={!importId.trim() || action.busy}
          onClick={() =>
            void action.run(
              () =>
                storageRequest<ImportStatus>(fetcher, 'configuration.import.status', {
                  importId: importId.trim(),
                }),
              async (result) => {
                setStatus(result)
                setConfirmed(false)
                if (['COMMITTED', 'ABORTED', 'EXPIRED'].includes(result.phase))
                  setPendingResult(false)
                if (
                  result.phase === 'PENDING' &&
                  result.importId === importId.trim() &&
                  commitRefused
                ) {
                  setPendingResult(false)
                  setPreflight(null)
                  setImportId('')
                  setCommitRefused(false)
                }
                if (result.phase === 'COMMITTED') {
                  setTransfer('')
                  setPreflight(null)
                  setKey('')
                  await refresh(true)
                }
              },
            )
          }
        >
          {t('storage.queryResult')}
        </Button>
        {status && (
          <p role="status" className="text-sm">
            {t('storage.operationStatus', {
              phase: t(`storage.operationPhase.${status.phase}`, {
                defaultValue: t('storage.operationPhase.UNKNOWN'),
              }),
            })}
          </p>
        )}
        {Boolean(action.error) && <StorageError error={action.error} />}
      </div>
    </details>
  )
}
