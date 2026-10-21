import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  storageCandidate,
  storageRequest,
  type StorageForm,
  type StorageLayer,
  type StorageTest,
} from '@/service/storage-client'
import { useAuthStore } from '@/stores/auth-store'

import { useStorage } from './storage-context'
import { inputClass, StorageError } from './storage-ui'
import { useStorageAction } from './use-storage-action'

export function StorageSetupForm() {
  const { t } = useTranslation()
  const { snapshot, fetcher, refresh, authorize } = useStorage()
  const [form, setForm] = useState<StorageForm>({
    kind: 'MONGODB',
    uri: '',
    configDatabase: 'tapstate_config',
    cacheDatabase: 'tapstate_cache',
    masterDatabase: 'tapstate_views',
    configCaPem: '',
    cacheCaPem: '',
  })
  const [proofs, setProofs] = useState<Partial<Record<StorageLayer, StorageTest>>>({})
  const version = useRef(0)
  const action = useStorageAction()
  if (!snapshot) return null
  const candidate = storageCandidate(form, snapshot.mode)
  function edit(key: keyof StorageForm, value: string) {
    version.current += 1
    setForm((current) => ({ ...current, [key]: value }))
    setProofs({})
    action.reset()
  }
  const scope = { operationId: snapshot.operationId, generation: snapshot.setupGeneration }
  const databaseNames = [
    form.cacheDatabase,
    form.masterDatabase,
    ...(snapshot.mode === 'OP' ? [form.configDatabase] : []),
  ]
  const valid =
    Boolean(form.uri.trim()) &&
    databaseNames.every((name) => name.trim()) &&
    new Set(databaseNames).size === databaseNames.length
  const tested = (['CONFIG', 'CACHE', 'MASTER'] as const).every(
    (layer) => proofs[layer] && Date.parse(proofs[layer]!.expiresAt) > Date.now(),
  )
  return (
    <form
      className="space-y-5"
      autoComplete="off"
      onSubmit={(event) => {
        event.preventDefault()
        if (!tested || !valid) return
        void action.run(
          async () =>
            storageRequest<{ setupPhase: string }>(fetcher, 'storage.setup.commit', {
              ...scope,
              candidate,
              testStamps: Object.fromEntries(
                Object.entries(proofs).map(([layer, proof]) => [layer, proof.testStamp]),
              ),
            }),
          async (result) => {
            if (result.setupPhase === 'COMPLETE') {
              setForm((current) => ({ ...current, uri: '', configCaPem: '', cacheCaPem: '' }))
              setProofs({})
              if (snapshot.mode === 'CLOUD') useAuthStore.getState().clear()
              else authorize('')
            }
            await refresh()
          },
        )
      }}
    >
      <div>
        <h2 className="text-base font-semibold">{t('storage.setupTitle')}</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          {t(snapshot.mode === 'CLOUD' ? 'storage.cloudSetup' : 'storage.opSetup')}
        </p>
      </div>
      <fieldset disabled={action.busy} className="space-y-4">
        {snapshot.mode === 'OP' && (
          <div className="block space-y-1 text-sm">
            <span>{t('storage.connector')}</span>
            <span className="flex gap-4">
              {(['MONGODB', 'ATLAS'] as const).map((kind) => (
                <label key={kind} className="flex min-h-11 items-center gap-2">
                  <input
                    type="radio"
                    name="connector"
                    checked={form.kind === kind}
                    onChange={() => edit('kind', kind)}
                  />
                  {t(kind === 'ATLAS' ? 'storage.atlas' : 'storage.mongodb')}
                </label>
              ))}
            </span>
          </div>
        )}
        <label className="block space-y-1 text-sm">
          <span>{t('storage.uri')}</span>
          <input
            className={inputClass}
            type="password"
            spellCheck={false}
            autoComplete="off"
            value={form.uri}
            onChange={(e) => edit('uri', e.target.value)}
            required
          />
        </label>
        <p className="text-muted-foreground text-sm">{t('storage.tlsHelp')}</p>
        {(snapshot.mode === 'CLOUD' || form.kind === 'ATLAS') && (
          <p className="text-muted-foreground text-sm">{t('storage.atlasHelp')}</p>
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          {(['CONFIG', 'CACHE', 'MASTER'] as const).map((layer) => {
            const field =
              layer === 'CONFIG'
                ? 'configDatabase'
                : layer === 'CACHE'
                  ? 'cacheDatabase'
                  : 'masterDatabase'
            return (
              <div key={layer} className="border-border space-y-2 rounded-lg border p-3">
                <label className="block space-y-1 text-sm">
                  <span>{t(`storage.layers.${layer}`)}</span>
                  {layer === 'CONFIG' && snapshot.mode === 'CLOUD' ? (
                    <p className="text-muted-foreground py-2">{t('storage.platformProvided')}</p>
                  ) : (
                    <input
                      className={inputClass}
                      value={form[field]}
                      onChange={(e) => edit(field, e.target.value)}
                      required
                    />
                  )}
                </label>
                <Button
                  className="min-h-11 sm:min-h-8"
                  type="button"
                  variant="outline"
                  disabled={!valid}
                  onClick={() => {
                    const selectedVersion = version.current
                    void action.run(
                      () =>
                        storageRequest<StorageTest>(fetcher, 'storage.test', {
                          ...scope,
                          candidate,
                          layer,
                        }),
                      (result) => {
                        if (version.current === selectedVersion)
                          setProofs((current) => ({ ...current, [layer]: result }))
                      },
                    )
                  }}
                >
                  {t('storage.test')}
                </Button>
                <p aria-live="polite" className="text-muted-foreground text-xs">
                  {t(proofs[layer] ? 'storage.testPassed' : 'storage.testRequired')}
                </p>
              </div>
            )
          })}
        </div>
        {new Set(databaseNames).size !== databaseNames.length && (
          <p role="alert" className="text-destructive text-sm">
            {t('storage.distinctDatabases')}
          </p>
        )}
        <details className="border-border rounded-lg border p-3">
          <summary className="cursor-pointer text-sm">{t('storage.customCa')}</summary>
          <p className="text-muted-foreground my-3 text-sm">{t('storage.customCaHelp')}</p>
          {(snapshot.mode === 'OP' ? ['configCaPem', 'cacheCaPem'] : ['cacheCaPem']).map(
            (field) => (
              <label key={field} className="mb-3 block space-y-1 text-sm">
                <span>{t(field === 'configCaPem' ? 'storage.configCa' : 'storage.cacheCa')}</span>
                <textarea
                  className={inputClass}
                  rows={4}
                  value={form[field as 'configCaPem' | 'cacheCaPem']}
                  onChange={(e) => edit(field as keyof StorageForm, e.target.value)}
                  maxLength={65536}
                  spellCheck={false}
                />
              </label>
            ),
          )}
        </details>
      </fieldset>
      {Boolean(action.error) && <StorageError error={action.error} />}
      <p className="text-muted-foreground text-sm">{t('storage.setupCommitHelp')}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          className="min-h-11 sm:min-h-8"
          type="submit"
          disabled={action.busy || !tested || !valid}
        >
          {t(action.busy ? 'storage.working' : 'storage.save')}
        </Button>
        <Button
          className="min-h-11 sm:min-h-8"
          type="button"
          variant="outline"
          disabled={action.busy}
          onClick={() => void refresh()}
        >
          {t('storage.refresh')}
        </Button>
      </div>
    </form>
  )
}
