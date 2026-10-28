import { Link, useRouterState } from '@tanstack/react-router'
import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  setupOperationScope,
  snapshotScope,
  StorageClientError,
  type InitializationProgress,
  type StorageLayer,
} from '@/service/storage-client'
import { useAuthStore } from '@/stores/auth-store'
import { replaceWithCloudConsole } from '@/utils/cloud-console'

import {
  CloudSetupContinuationProvider,
  cloudSetupContinuationUrl,
  useCloudSetupContinuation,
} from './cloud-setup-continuation'
import { ConfigurationTransfer } from './configuration-transfer'
import { InitializationMilestones } from './initialization-milestones'
import { StorageProvider, useStorage } from './storage-context'
import { StorageRecovery } from './storage-recovery'
import { StorageSetupForm } from './storage-setup-form'
import {
  inputClass,
  StorageError,
  StorageFrame,
  StorageHealthPanel,
  StorageIndicator,
} from './storage-ui'
import { useStorageAction } from './use-storage-action'

export function StorageBoundary({ children }: { children: ReactNode }) {
  const session = useAuthStore((state) => state.sessionRevision)
  return (
    <CloudSetupContinuationProvider>
      <StorageProvider key={session}>
        <StorageGate>{children}</StorageGate>
      </StorageProvider>
    </CloudSetupContinuationProvider>
  )
}

export function StorageGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const {
    entry,
    snapshot,
    lastKnownSnapshot,
    loading,
    error,
    refresh,
    authorized,
    authorize,
    setSetupPending,
    autoRefreshing,
    session,
    authorityRevision,
  } = useStorage()
  const authenticated = useAuthStore((state) => state.isAuthenticated)
  const cloudProfile = useAuthStore((state) => state.profile === 'cloud')
  const setupSubmission = useStorageAction('setup')
  const continuation = useCloudSetupContinuation()
  const [continuing, setContinuing] = useState(false)
  const [handoffProgress, setHandoffProgress] = useState<InitializationProgress>()
  useEffect(() => {
    if (!authenticated || !snapshot) return
    if (
      snapshot.mode === 'CLOUD' &&
      snapshot.businessPhase !== 'READY' &&
      snapshot.initializationProgress?.state === 'RUNNING'
    ) {
      void continuation.prepare(snapshot).catch(() => {})
    } else if (
      !setupSubmission.busy &&
      (snapshot.businessPhase === 'READY' ||
        snapshot.initializationProgress?.state === 'FAILED' ||
        (continuation.intent && continuation.intent.scope !== setupOperationScope(snapshot)))
    ) {
      continuation.discard()
    }
  }, [
    authenticated,
    snapshot,
    setupSubmission.busy,
    continuation.prepare,
    continuation.discard,
    continuation.intent,
  ])
  useEffect(() => {
    const intent = continuation.intent
    if (
      !authenticated &&
      intent &&
      intent.armed &&
      session === intent.session + 1 &&
      !error &&
      entry?.mode === 'CLOUD' &&
      !entry.management &&
      ['LOGIN', 'SETUP_REQUIRED'].includes(entry.entry)
    ) {
      setContinuing(true)
      setHandoffProgress(intent.progress)
      continuation.discard()
      replaceWithCloudConsole(cloudSetupContinuationUrl(intent))
    }
  }, [authenticated, session, entry, error, continuation.intent, continuation.discard])
  const [submittedChecks, setSubmittedChecks] = useState<{
    scope: string
    checkedAt: Record<StorageLayer, string>
  }>()
  const setupScope = snapshot
    ? `${session}:${authorityRevision}:${setupOperationScope(snapshot)}`
    : ''
  useEffect(() => {
    if (
      submittedChecks &&
      ((snapshot && submittedChecks.scope !== setupScope) ||
        (error instanceof StorageClientError && error.status < 500))
    )
      setSubmittedChecks(undefined)
  }, [error, setupScope, snapshot, submittedChecks])
  useEffect(() => {
    setSetupPending(setupSubmission.busy)
    return () => setSetupPending(false)
  }, [setSetupPending, setupSubmission.busy])
  const pendingHandoff =
    !authenticated && continuation.intent?.armed && session === continuation.intent.session + 1
      ? continuation.intent
      : undefined
  const awaitingEntry =
    pendingHandoff &&
    (loading ||
      (!error && entry?.mode === 'CLOUD' && !entry.management && entry.entry === 'UNAVAILABLE'))
  const continuingProgress = pendingHandoff?.progress ?? handoffProgress
  if (continuing || awaitingEntry)
    return (
      <StorageFrame>
        <h1 role="status">
          <StorageIndicator tone="working">
            {t('storage.initialization.connecting')}
          </StorageIndicator>
        </h1>
        {continuingProgress && (
          <InitializationMilestones progress={continuingProgress} waitingForSignIn />
        )}
        {!continuingProgress && (
          <Button
            variant="outline"
            className="min-h-11 sm:min-h-8"
            onClick={() => replaceWithCloudConsole()}
          >
            {t('storage.initialization.backToCloud')}
          </Button>
        )}
      </StorageFrame>
    )
  if (loading)
    return (
      <StorageFrame>
        <p role="status">
          <StorageIndicator tone="working">
            {t(cloudProfile ? 'storage.initialization.loadingCluster' : 'storage.loading')}
          </StorageIndicator>
        </p>
      </StorageFrame>
    )
  if (error)
    return (
      <StorageFrame>
        <StorageError error={error} />
        {(authenticated ? lastKnownSnapshot?.initializationProgress : pendingHandoff?.progress)
          ?.state === 'RUNNING' &&
          (error instanceof TypeError ||
            (error instanceof StorageClientError && error.status >= 500)) && (
            <InitializationMilestones
              progress={
                (authenticated
                  ? lastKnownSnapshot?.initializationProgress
                  : pendingHandoff?.progress)!
              }
              stale
              waitingForSignIn={Boolean(pendingHandoff)}
            />
          )}
        {autoRefreshing && (
          <p role="status" className="text-muted-foreground text-sm">
            {t('storage.autoRetry')}
          </p>
        )}
        <Button className="min-h-11 sm:min-h-8" variant="outline" onClick={() => void refresh()}>
          {t('storage.refresh')}
        </Button>
        {entry?.management && (
          <Button className="min-h-11 sm:min-h-8" variant="ghost" onClick={() => authorize('')}>
            {t('storage.reauthorize')}
          </Button>
        )}
        {!authenticated && (
          <LoginAction
            cloud={entry ? entry.mode === 'CLOUD' : cloudProfile}
            cloudTarget={pendingHandoff ? cloudSetupContinuationUrl(pendingHandoff) : undefined}
          />
        )}
      </StorageFrame>
    )
  if (!entry)
    return (
      <StorageFrame>
        <StorageError error={new StorageClientError('unavailable', 503)} />
      </StorageFrame>
    )
  if (
    entry.management &&
    !authorized &&
    entry.entry !== 'LOGIN' &&
    entry.entry !== 'RESTART_REQUIRED' &&
    entry.entry !== 'UNAVAILABLE'
  )
    return (
      <StorageFrame>
        <CapabilityForm />
      </StorageFrame>
    )
  if (snapshot) {
    if (snapshot.businessPhase === 'READY' && !entry.management) return children
    const progress = snapshot.mode === 'CLOUD' ? snapshot.initializationProgress : undefined
    const showMilestones = progress && ['RUNNING', 'FAILED'].includes(progress.state)
    const showSetup =
      progress?.state === 'RUNNING'
        ? false
        : setupSubmission.busy
          ? ['NOT_CONFIGURED', 'PREPARING', 'AUTH_READY', 'RECOVERING'].includes(
              snapshot.businessPhase,
            )
          : snapshot.setupPhase !== 'COMPLETE' &&
            snapshot.allowedActions.includes('storage.setup.commit') &&
            !snapshot.allowedActions.includes('storage.recovery.plan')
    return (
      <StorageFrame>
        <div
          key={
            snapshot.setupPhase === 'COMPLETE'
              ? snapshotScope(snapshot)
              : setupOperationScope(snapshot)
          }
          className="space-y-6"
        >
          <h1 className="text-xl font-semibold">{t('storage.title')}</h1>
          {showMilestones && <InitializationMilestones progress={progress} />}
          <StorageHealthPanel
            snapshot={snapshot}
            showPhaseSummary={!showMilestones}
            autoRefreshing={autoRefreshing && !setupSubmission.busy}
            setupChecks={
              progress
                ? progress.state === 'RUNNING'
                  ? Object.fromEntries(
                      progress.connectionChecks.map((check) => [check.layer, check.checkedAt]),
                    )
                  : undefined
                : submittedChecks?.scope === setupScope &&
                    ['NOT_CONFIGURED', 'PREPARING', 'AUTH_READY'].includes(
                      snapshot.businessPhase,
                    ) &&
                    (setupSubmission.busy || snapshot.businessPhase !== 'NOT_CONFIGURED')
                  ? submittedChecks.checkedAt
                  : undefined
            }
          />
          {showSetup && (
            <StorageSetupForm
              submission={setupSubmission}
              beforeSubmit={() => continuation.prepare(snapshot)}
              onDispatched={() => continuation.submitted(snapshot)}
              onRefused={(failure) => continuation.refused(snapshot, failure)}
              onSubmitted={(checkedAt) => setSubmittedChecks({ scope: setupScope, checkedAt })}
              onTestsInvalidated={() => setSubmittedChecks(undefined)}
            />
          )}
          {!showSetup &&
            Boolean(setupSubmission.error) &&
            (progress?.state === 'RUNNING' &&
            (setupSubmission.error instanceof TypeError ||
              (setupSubmission.error instanceof StorageClientError &&
                setupSubmission.error.status >= 500)) ? (
              <p role="status" className="text-muted-foreground text-sm">
                {t('storage.setupResultPending')}
              </p>
            ) : (
              <StorageError error={setupSubmission.error} />
            ))}
          {snapshot.allowedActions.includes('first-admin') && <FirstAdminForm />}
          {snapshot.allowedActions.includes('storage.recovery.plan') && <StorageRecovery />}
          {snapshot.allowedActions.includes('configuration.import.status') && (
            <ConfigurationTransfer />
          )}
          {!showSetup && (
            <Button
              className="min-h-11 sm:min-h-8"
              variant="outline"
              onClick={() => void refresh()}
            >
              {t('storage.refresh')}
            </Button>
          )}
          {entry.management && (
            <Button className="min-h-11 sm:min-h-8" variant="ghost" onClick={() => authorize('')}>
              {t('storage.reauthorize')}
            </Button>
          )}
        </div>
      </StorageFrame>
    )
  }
  if (entry.entry === 'UNAVAILABLE')
    return (
      <StorageFrame>
        {entry.mode === 'CLOUD' && !authenticated ? (
          <div role="alert" className="border-border rounded-md border p-3 text-sm">
            {t('storage.entryUnavailable')}
          </div>
        ) : (
          <StorageError error={new StorageClientError('unavailable', 503)} />
        )}
        {autoRefreshing && (
          <p role="status" className="text-muted-foreground text-sm">
            {t('storage.autoRetry')}
          </p>
        )}
        <Button className="min-h-11 sm:min-h-8" variant="outline" onClick={() => void refresh()}>
          {t('storage.refresh')}
        </Button>
      </StorageFrame>
    )
  if (entry.entry === 'RESTART_REQUIRED')
    return (
      <StorageFrame>
        <h1 className="font-semibold">{t('storage.phase.RESTART_REQUIRED')}</h1>
        <p className="text-muted-foreground text-sm">{t('storage.phaseHelp.RESTART_REQUIRED')}</p>
        <Button className="min-h-11 sm:min-h-8" variant="outline" onClick={() => void refresh()}>
          {t('storage.refresh')}
        </Button>
      </StorageFrame>
    )
  if (entry.mode === 'OP' && ['SETUP_REQUIRED', 'FIRST_ADMIN_REQUIRED'].includes(entry.entry))
    return (
      <StorageFrame>
        <h1 className="font-semibold">{t('storage.ownerRequired')}</h1>
        <p className="text-muted-foreground text-sm">{t('storage.managementHelp')}</p>
        <Button className="min-h-11 sm:min-h-8" variant="outline" onClick={() => void refresh()}>
          {t('storage.refresh')}
        </Button>
      </StorageFrame>
    )
  if (entry.management)
    return (
      <StorageFrame>
        <h1 className="font-semibold">{t('storage.adminComplete')}</h1>
        <p className="text-muted-foreground text-sm">{t('storage.normalLoginHelp')}</p>
      </StorageFrame>
    )
  if (!authenticated && entry.mode === 'OP' && pathname === '/login') return children
  return (
    <StorageFrame>
      <h1 className="font-semibold">{t('storage.loginTitle')}</h1>
      <p className="text-muted-foreground text-sm">{t('storage.loginHelp')}</p>
      <LoginAction cloud={entry.mode === 'CLOUD'} />
    </StorageFrame>
  )
}

function LoginAction({ cloud, cloudTarget }: { cloud: boolean; cloudTarget?: string }) {
  const { t } = useTranslation()
  return cloud ? (
    <Button className="min-h-11 sm:min-h-8" onClick={() => replaceWithCloudConsole(cloudTarget)}>
      {t('storage.cloudLogin')}
    </Button>
  ) : (
    <Link className="text-sm underline underline-offset-4" to="/login">
      {t('storage.opLogin')}
    </Link>
  )
}
function CapabilityForm() {
  const { t } = useTranslation()
  const { authorize } = useStorage()
  const [secret, setSecret] = useState('')
  return (
    <form
      className="space-y-4"
      autoComplete="off"
      onSubmit={(event) => {
        event.preventDefault()
        authorize(secret.trim())
        setSecret('')
      }}
    >
      <h1 className="text-xl font-semibold">{t('storage.ownerRequired')}</h1>
      <p className="text-muted-foreground text-sm">{t('storage.capabilityHelp')}</p>
      <label className="block space-y-1 text-sm">
        <span>{t('storage.capability')}</span>
        <input
          type="password"
          className={inputClass}
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          autoComplete="off"
          required
        />
      </label>
      <Button className="min-h-11 sm:min-h-8" type="submit" disabled={!secret.trim()}>
        {t('storage.continue')}
      </Button>
    </form>
  )
}
function FirstAdminForm() {
  const { t } = useTranslation()
  const { fetcher, authorize, refresh } = useStorage()
  const action = useStorageAction()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [unknown, setUnknown] = useState(false)
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        setUnknown(true)
        void action.run(
          async () => {
            const response = await fetcher('/installation/first-admin', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username, password }),
              cache: 'no-store',
            })
            if (!response.ok) {
              if (response.status < 500) setUnknown(false)
              throw new StorageClientError('request', response.status)
            }
          },
          async () => {
            setPassword('')
            authorize('')
            await refresh()
          },
        )
      }}
    >
      <h2 className="font-semibold">{t('storage.firstAdminTitle')}</h2>
      <label className="block space-y-1 text-sm">
        <span>{t('auth.login.usernameLabel')}</span>
        <input
          className={inputClass}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          disabled={action.busy || unknown}
          required
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span>{t('auth.login.passwordLabel')}</span>
        <input
          className={inputClass}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          disabled={action.busy || unknown}
          required
        />
      </label>
      <Button
        className="min-h-11 sm:min-h-8"
        type="submit"
        disabled={action.busy || unknown || !username.trim() || !password}
      >
        {t('storage.createAdmin')}
      </Button>
      {unknown && <p className="text-muted-foreground text-sm">{t('storage.adminUnknownHelp')}</p>}
      {Boolean(action.error) && <StorageError error={action.error} />}
    </form>
  )
}
