import { Eye, EyeOff } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  storageCandidate,
  storageRequest,
  snapshotScope,
  type StorageForm,
  type StorageLayer,
  type StorageTest,
} from '@/service/storage-client'
import { useAuthStore } from '@/stores/auth-store'

import { useStorage } from './storage-context'
import { inputClass, StorageError, StorageIndicator } from './storage-ui'
import { useStorageAction } from './use-storage-action'

export function StorageSetupForm({
  submission: owner,
  onSubmitted,
  onTestsInvalidated,
  beforeSubmit,
}: {
  submission?: ReturnType<typeof useStorageAction>
  onSubmitted?: (checkedAt: Record<StorageLayer, string>) => void
  onTestsInvalidated?: () => void
  beforeSubmit?: () => Promise<void>
} = {}) {
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
  const [proofs, setProofs] = useState<
    Partial<Record<StorageLayer, StorageTest & { checkedAt: string }>>
  >({})
  const [showUri, setShowUri] = useState(false)
  const [testingLayer, setTestingLayer] = useState<StorageLayer | null>(null)
  const [failedLayer, setFailedLayer] = useState<StorageLayer | null>(null)
  const [now, setNow] = useState(Date.now)
  const uriId = useId()
  const version = useRef(0)
  const action = useStorageAction()
  const localSubmission = useStorageAction('setup')
  const submission = owner ?? localSubmission
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const busy = action.busy || submission.busy
  const testingScope = snapshot ? snapshotScope(snapshot) : ''
  const previousTestingScope = useRef(testingScope)
  useEffect(() => {
    if (previousTestingScope.current === testingScope) return
    previousTestingScope.current = testingScope
    version.current += 1
    setProofs({})
    setTestingLayer(null)
    setFailedLayer(null)
  }, [testingScope])
  useEffect(() => {
    const future = Object.values(proofs)
      .map((proof) => Date.parse(proof.expiresAt))
      .filter((expiresAt) => expiresAt > Date.now())
    if (!future.length) return
    const timer = setTimeout(() => setNow(Date.now()), Math.min(...future) - Date.now() + 1)
    return () => clearTimeout(timer)
  }, [proofs, now])
  if (!snapshot) return null
  const mode = snapshot.mode
  const candidate = storageCandidate(form, mode)
  function edit(key: keyof StorageForm, value: string) {
    onTestsInvalidated?.()
    version.current += 1
    setForm((current) => ({ ...current, [key]: value }))
    setProofs({})
    setTestingLayer(null)
    setFailedLayer(null)
    action.reset()
    submission.reset()
  }
  const scope = { operationId: snapshot.operationId, generation: snapshot.setupGeneration }
  const databaseNames = [
    form.cacheDatabase,
    form.masterDatabase,
    ...(mode === 'OP' ? [form.configDatabase] : []),
  ]
  const valid =
    Boolean(form.uri.trim()) &&
    databaseNames.every((name) => name.trim()) &&
    new Set(databaseNames).size === databaseNames.length
  const fresh = (layer: StorageLayer) =>
    Boolean(proofs[layer] && Date.parse(proofs[layer]!.expiresAt) > Date.now())
  const tested = (['CONFIG', 'CACHE', 'MASTER'] as const).every(fresh)
  function testLayer(layer: StorageLayer) {
    onTestsInvalidated?.()
    const selectedVersion = version.current
    let attempted = layer
    setFailedLayer(null)
    void action.run(
      async (isCurrent) => {
        const check = async (next: StorageLayer) => {
          if (!isCurrent() || version.current !== selectedVersion) return
          attempted = next
          setTestingLayer(next)
          setProofs((current) => {
            const retained = { ...current }
            delete retained[next]
            return retained
          })
          const result = await storageRequest<StorageTest>(fetcher, 'storage.test', {
            ...scope,
            candidate,
            layer: next,
          })
          if (isCurrent() && version.current === selectedVersion) {
            setProofs((current) => ({
              ...current,
              [next]: { ...result, checkedAt: new Date().toISOString() },
            }))
          }
        }
        // Cloud owns CONFIG. Its existing server-issued proof is acquired with the customer's check.
        if (mode === 'CLOUD' && !fresh('CONFIG')) await check('CONFIG')
        await check(layer)
      },
      () => setTestingLayer(null),
      () => {
        if (version.current === selectedVersion) {
          setFailedLayer(attempted)
          setTestingLayer(null)
        }
      },
    )
  }
  if (submission.busy) {
    return (
      <section className="space-y-4" aria-label={t('storage.setupProgressTitle')}>
        <h2 className="text-base font-semibold" role="status">
          <StorageIndicator tone="working">{t('storage.setupProgressTitle')}</StorageIndicator>
        </h2>
        <p className="text-muted-foreground text-sm">
          {t(
            snapshot.bindingVersion > 0 ? 'storage.setupSavedHelp' : 'storage.setupSubmittingHelp',
          )}
        </p>
        <p className="text-muted-foreground text-sm">{t('storage.autoRefresh')}</p>
        {Boolean(submission.error) && <StorageError error={submission.error} />}
        <Button
          className="min-h-11 sm:min-h-8"
          type="button"
          variant="outline"
          onClick={() => void refresh()}
        >
          {t('storage.refresh')}
        </Button>
      </section>
    )
  }
  return (
    <form
      className="space-y-5"
      autoComplete="off"
      onSubmit={(event) => {
        event.preventDefault()
        if (!(['CONFIG', 'CACHE', 'MASTER'] as const).every(fresh) || !valid) return
        void submission.run(
          async (isCurrent) => {
            await beforeSubmit?.()
            if (!isCurrent()) throw new DOMException('Request superseded', 'AbortError')
            // Retain only display evidence, never credentials or reusable submission proofs.
            onSubmitted?.({
              CONFIG: proofs.CONFIG!.checkedAt,
              CACHE: proofs.CACHE!.checkedAt,
              MASTER: proofs.MASTER!.checkedAt,
            })
            return storageRequest<{ setupPhase: string }>(fetcher, 'storage.setup.commit', {
              ...scope,
              candidate,
              testStamps: Object.fromEntries(
                Object.entries(proofs).map(([layer, proof]) => [layer, proof.testStamp]),
              ),
            })
          },
          async (result) => {
            if (result.setupPhase === 'COMPLETE') {
              if (mounted.current) {
                setForm((current) => ({ ...current, uri: '', configCaPem: '', cacheCaPem: '' }))
                setProofs({})
                setShowUri(false)
              }
              if (mode === 'CLOUD') useAuthStore.getState().clear()
              else authorize('')
            }
            await refresh()
          },
          () => {
            if (mounted.current) setProofs({})
          },
        )
      }}
    >
      <div>
        <h2 className="text-base font-semibold">
          {t(
            snapshot.setupPhase === 'STORAGE_BOUND'
              ? 'storage.resumeSetupTitle'
              : 'storage.setupTitle',
          )}
        </h2>
        <p className="text-muted-foreground mt-2 text-sm">
          {t(
            snapshot.setupPhase === 'STORAGE_BOUND'
              ? 'storage.resumeSetupHelp'
              : mode === 'CLOUD'
                ? 'storage.cloudSetup'
                : 'storage.opSetup',
          )}
        </p>
      </div>
      <fieldset disabled={busy} className="space-y-4">
        {mode === 'OP' && (
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
        <div className="space-y-1 text-sm">
          <label htmlFor={uriId}>
            <span>{t('storage.uri')}</span>
          </label>
          <div className="relative">
            <input
              id={uriId}
              className={`${inputClass} pr-14`}
              type={showUri ? 'text' : 'password'}
              spellCheck={false}
              autoComplete="off"
              value={form.uri}
              onChange={(e) => edit('uri', e.target.value)}
              required
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute top-1/2 right-1 min-h-10 min-w-10 -translate-y-1/2"
              aria-label={t(showUri ? 'storage.hideUri' : 'storage.showUri')}
              title={t(showUri ? 'storage.hideUri' : 'storage.showUri')}
              aria-pressed={showUri}
              onClick={() => setShowUri((current) => !current)}
            >
              {showUri ? (
                <EyeOff className="size-4" aria-hidden="true" />
              ) : (
                <Eye className="size-4" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground text-sm">{t('storage.tlsHelp')}</p>
        {(mode === 'CLOUD' || form.kind === 'ATLAS') && (
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
              <div
                key={layer}
                role="group"
                aria-label={t(`storage.layers.${layer}`)}
                className="border-border space-y-2 rounded-lg border p-3"
              >
                <label className="block space-y-1 text-sm">
                  <span>{t(`storage.layers.${layer}`)}</span>
                  {layer === 'CONFIG' && mode === 'CLOUD' ? (
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
                {!(layer === 'CONFIG' && mode === 'CLOUD') && (
                  <Button
                    className="min-h-11 sm:min-h-8"
                    type="button"
                    variant="outline"
                    disabled={!valid}
                    onClick={() => testLayer(layer)}
                  >
                    {t('storage.test')}
                  </Button>
                )}
                <p aria-live="polite" className="text-muted-foreground text-xs">
                  <StorageIndicator
                    tone={
                      testingLayer === layer
                        ? 'working'
                        : failedLayer === layer
                          ? 'error'
                          : fresh(layer)
                            ? 'success'
                            : proofs[layer]
                              ? 'warning'
                              : 'pending'
                    }
                  >
                    {t(
                      testingLayer === layer
                        ? 'storage.testWorking'
                        : failedLayer === layer
                          ? 'storage.testFailed'
                          : fresh(layer)
                            ? 'storage.testPassed'
                            : proofs[layer]
                              ? 'storage.testExpired'
                              : layer === 'CONFIG' && mode === 'CLOUD'
                                ? 'storage.testAutomatic'
                                : 'storage.testRequired',
                    )}
                  </StorageIndicator>
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
          {(mode === 'OP' ? ['configCaPem', 'cacheCaPem'] : ['cacheCaPem']).map((field) => (
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
          ))}
        </details>
      </fieldset>
      {Boolean(action.error) && <StorageError error={action.error} />}
      {Boolean(submission.error) && <StorageError error={submission.error} />}
      <p className="text-muted-foreground text-sm">{t('storage.setupCommitHelp')}</p>
      <div className="flex flex-wrap gap-2">
        <Button className="min-h-11 sm:min-h-8" type="submit" disabled={busy || !tested || !valid}>
          {t(
            busy
              ? 'storage.working'
              : snapshot.setupPhase === 'STORAGE_BOUND'
                ? 'storage.resumeSetup'
                : 'storage.save',
          )}
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
