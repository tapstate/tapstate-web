import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import { useBlocker } from '@tanstack/react-router'
import { ArrowLeft, Plus, Mail, Webhook } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  alertCall,
  AlertClientError,
  emptyMessages,
  testCommandId,
  type AlertForm,
  type AlarmRow,
  type AlertPage,
  type Catalog,
  type DeliveryRow,
  type Messages,
} from '@/service/alert-client'
import { useAuthStore } from '@/stores/auth-store'

import { AlertSelect } from './alert-select'
import { Severity, Time } from './alert-shared'
import './alerts.css'

export function AlertSettings() {
  const session = useAuthStore((s) => s.sessionRevision)
  return <SettingsContent key={session} />
}
function SettingsContent() {
  const { t } = useTranslation()
  const apiFetch = useAuthStore((s) => s.apiFetch)
  const queryClient = useQueryClient()
  const catalog = useQuery({
    queryKey: ['alerts', 'catalog'],
    queryFn: ({ signal }) => alertCall<Catalog>(apiFetch, 'catalog', {}, signal),
  })
  const cloud = catalog.data?.deployment === 'CLOUD_MANAGED'
  const external = catalog.data?.deployment === 'ON_PREM'
  const [kind, setKind] = useState('RULE')
  const [form, setForm] = useState<AlertForm | null>(null)
  const [editingInhibition, setEditingInhibition] = useState(false)
  const [baseline, setBaseline] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const [notice, setNotice] = useState('')
  const serial = useRef(0)
  const mounted = useRef(true)
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null)
  const dirty = form !== null && JSON.stringify(form) !== baseline
  const blocker = useBlocker({
    shouldBlockFn: () => dirty,
    enableBeforeUnload: dirty,
    withResolver: true,
  })
  const rows = useInfiniteQuery({
    queryKey: ['alerts', 'configuration', kind],
    enabled: Boolean(catalog.data) && (external || !['SUBSCRIPTION', 'RECEIVER'].includes(kind)),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      alertCall<AlertPage<AlertForm>>(
        apiFetch,
        'configuration/list',
        { kind, cursor: pageParam, limit: 25 },
        signal,
      ),
    getNextPageParam: (p) => p.nextCursor ?? undefined,
  })
  const receivers = useInfiniteQuery({
    queryKey: ['alerts', 'configuration', 'receivers-picker'],
    enabled: external && kind === 'SUBSCRIPTION' && !editingInhibition,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      alertCall<AlertPage<AlertForm>>(
        apiFetch,
        'configuration/list',
        { kind: 'RECEIVER', cursor: pageParam, limit: 100 },
        signal,
      ),
    getNextPageParam: (p) => p.nextCursor ?? undefined,
  })
  const inhibitionRoutes = useInfiniteQuery({
    queryKey: ['alerts', 'inhibition-routes'],
    enabled: external && kind === 'SILENCE',
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      alertCall<AlertPage<AlertForm>>(
        apiFetch,
        'configuration/list',
        { kind: 'SUBSCRIPTION', cursor: pageParam, limit: 100 },
        signal,
      ),
    getNextPageParam: (p) => p.nextCursor ?? undefined,
  })
  const [chosenTestTarget, setChosenTestTarget] = useState('')
  const testTargets = [...new Set(form?.transport?.recipients ?? [])]
  const testTarget = testTargets.includes(chosenTestTarget)
    ? chosenTestTarget
    : (testTargets[0] ?? '')
  const [test, setTest] = useState<{
    commandId: string
    candidateId: string
    startedAt: number
    signature: number
    admission: 'SUBMITTING' | 'ACKNOWLEDGED' | 'UNKNOWN'
    result?: DeliveryRow
  } | null>(null)
  const result = useQuery({
    queryKey: ['alerts', 'test', test?.commandId, test?.candidateId],
    enabled: Boolean(test && test.admission !== 'SUBMITTING'),
    queryFn: async ({ signal }) => {
      const record = await alertCall<DeliveryRow>(
        apiFetch,
        'test-result',
        { commandId: test!.commandId },
        signal,
      )
      return { record, current: record.candidateId === test!.candidateId }
    },
    refetchInterval: (q) =>
      q.state.data?.record.stopped ||
      q.state.data?.current === false ||
      Date.now() - (test?.startedAt ?? 0) > 10 * 60 * 1000
        ? false
        : 1000,
    retry: false,
  })
  const [preview, setPreview] = useState<{
    subject: string
    text: string
    html: string
    webhook: string
  } | null>(null)
  const [previewKind, setPreviewKind] = useState('FAULT')
  const [ruleSample, setRuleSample] = useState('BAD')
  const [ruleResult, setRuleResult] = useState<{
    status: string
    quality: string
    severity: string
    virtualElapsedSeconds: number
  } | null>(null)
  async function previewRule() {
    if (!form) return
    const stamp = serial.current
    setError(false)
    try {
      const value = await alertCall<{
        status: string
        quality: string
        severity: string
        virtualElapsedSeconds: number
      }>(apiFetch, 'rule-preview', { form, sample: ruleSample })
      if (mounted.current && stamp === serial.current) setRuleResult(value)
    } catch {
      if (mounted.current && stamp === serial.current) setError(true)
    }
  }

  const [previewFormat, setPreviewFormat] = useState('html')
  const [matchCandidate, setMatchCandidate] = useState<{ form: object; serial: number } | null>(
    null,
  )
  const matching = useInfiniteQuery({
    queryKey: ['alerts', 'route-preview', matchCandidate?.serial],
    enabled: matchCandidate !== null,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      alertCall<AlertPage<AlarmRow>>(
        apiFetch,
        'route-preview',
        { form: matchCandidate!.form, cursor: pageParam, limit: 25 },
        signal,
      ),
    getNextPageParam: (p) => p.nextCursor ?? undefined,
  })
  const previewSignature = JSON.stringify([
    kind,
    form?.channels,
    previewKind,
    previewFormat,
    serial.current,
  ])
  useEffect(() => {
    if (editingInhibition || kind !== 'SUBSCRIPTION' || !form?.channels?.length) return
    const wanted = previewFormat === 'webhook' ? 'webhook' : 'email'
    if (!form.channels.some((c) => c.channelType === wanted)) {
      setPreviewFormat(form.channels[0].channelType === 'webhook' ? 'webhook' : 'text')
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(() => {
      void renderPreview(controller.signal)
    }, 200)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [previewSignature])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      serial.current++
    }
  }, [])

  function leave(action: () => void) {
    if (dirty) setPendingLeave(() => action)
    else action()
  }
  function edit(next: AlertForm | null) {
    serial.current++
    setTest(null)
    setPreview(null)
    setRuleResult(null)
    setMatchCandidate(null)
    setNotice('')
    setError(false)
    setChosenTestTarget('')
    if (next === null) setEditingInhibition(false)
    setForm(next)
    setBaseline(JSON.stringify(next))
  }
  function update(patch: Partial<AlertForm> | ((current: AlertForm) => Partial<AlertForm>)) {
    serial.current++
    setForm((f) => {
      if (!f) return f
      const change = typeof patch === 'function' ? patch(f) : patch
      const next = { ...f, ...change }
      if (next.etag && next.retainMaterial && change.transport) {
        const original = JSON.parse(baseline) as AlertForm
        if (JSON.stringify(original.transport) !== JSON.stringify(next.transport))
          next.retainMaterial = false
      }
      return next
    })
    setTest(null)
    setPreview(null)
    setRuleResult(null)
    setMatchCandidate(null)
    setNotice('')
  }
  async function save(): Promise<boolean> {
    if (!form) return false
    const stamp = serial.current
    setBusy(true)
    setError(false)
    try {
      const saved = await alertCall<AlertForm>(apiFetch, 'configuration/save', {
        kind: form.kind,
        id: form.id,
        etag: form.etag ?? '0',
        form,
      })
      if (!mounted.current || stamp !== serial.current) return false
      edit(saved)
      setNotice('saved')
      await queryClient.invalidateQueries({ queryKey: ['alerts'] })
      return true
    } catch {
      if (mounted.current) setError(true)
      return false
    } finally {
      if (mounted.current) setBusy(false)
    }
  }
  async function retire(row: AlertForm) {
    setBusy(true)
    setError(false)
    try {
      await alertCall(apiFetch, 'configuration/retire', {
        kind: row.kind,
        id: row.id,
        etag: row.etag,
      })
      if (mounted.current) {
        edit(null)
        await rows.refetch()
      }
    } catch {
      if (mounted.current) setError(true)
    } finally {
      if (mounted.current) setBusy(false)
    }
  }
  async function sendTest() {
    if (!form) return
    const stamp = serial.current
    const commandId = testCommandId()
    const candidateId = crypto.randomUUID()
    const startedAt = Date.now()
    setTest({ commandId, candidateId, startedAt, signature: stamp, admission: 'SUBMITTING' })
    setBusy(true)
    setError(false)
    try {
      const accepted = await alertCall<DeliveryRow>(apiFetch, 'test', {
        commandId,
        candidateId,
        form,
        existingId: form.etag ? form.id : undefined,
        etag: form.etag,
        target: testTarget,
      })
      if (mounted.current && serial.current === stamp) {
        if (accepted.candidateId !== candidateId) {
          setTest(null)
          setError(true)
        } else
          setTest({
            commandId,
            candidateId,
            startedAt,
            signature: stamp,
            admission: 'ACKNOWLEDGED',
            result: accepted,
          })
      }
    } catch (failure) {
      if (mounted.current && serial.current === stamp) {
        if (failure instanceof AlertClientError && failure.status >= 400 && failure.status < 500) {
          setTest(null)
          setError(true)
        } else
          setTest({ commandId, candidateId, startedAt, signature: stamp, admission: 'UNKNOWN' })
      }
    } finally {
      if (mounted.current) setBusy(false)
    }
  }
  async function renderPreview(signal?: AbortSignal) {
    const channel = form?.channels?.find(
      (c) => c.channelType === (previewFormat === 'webhook' ? 'webhook' : 'email'),
    )
    if (!channel) return
    const stamp = serial.current
    setError(false)
    try {
      const value = await alertCall<{
        subject: string
        text: string
        html: string
        webhook: string
      }>(
        apiFetch,
        'preview',
        {
          messages: channel.messages,
          channel: channel.channelType,
          kind: previewKind,
        },
        signal,
      )
      if (mounted.current && stamp === serial.current) setPreview(value)
    } catch {
      if (mounted.current && !signal?.aborted) setError(true)
    }
  }
  const testResult = (result.data?.current ? result.data.record : undefined) ?? test?.result
  const blocked = blocker.status === 'blocked' || pendingLeave !== null
  function discard() {
    const action = pendingLeave
    setPendingLeave(null)
    edit(null)
    if (blocker.status === 'blocked') blocker.proceed()
    else action?.()
  }
  async function saveLeave() {
    if (await save()) {
      const action = pendingLeave
      setPendingLeave(null)
      if (blocker.status === 'blocked') blocker.proceed()
      else action?.()
    }
  }
  function create() {
    const type = catalog.data?.types.find((t) => t.inputAvailable) ?? catalog.data?.types[0]
    const next: AlertForm = {
      kind,
      id: crypto.randomUUID(),
      name: '',
      enabled: true,
      allResources: true,
      resources: [],
    }
    if (kind === 'RULE')
      Object.assign(next, {
        typeId: type?.id,
        typeVersion: type?.version,
        resourceKinds: type?.resourceKinds,
        parameters: Object.fromEntries(type?.parameters.map((p) => [p.name, p.defaultValue]) ?? []),
        severity: 'DEFAULT',
      })
    if (kind === 'RECEIVER')
      Object.assign(next, {
        transport: {
          channelType: 'email',
          host: '',
          port: 465,
          encryption: 'IMPLICIT_TLS',
          authentication: 'NONE',
          trust: 'SYSTEM',
          from: '',
          recipients: [],
        },
        retainMaterial: false,
      })
    if (kind === 'SUBSCRIPTION')
      Object.assign(next, {
        resourceKinds: ['pipeline', 'source', 'cluster-node', 'cluster-storage'],
        typeIds: [],
        severities: [],
        groupBy: ['RESOURCE'],
        initialWaitSeconds: 30,
        changeIntervalSeconds: 300,
        repeatIntervalSeconds: 14400,
        channels: [{ channelType: 'email', receivers: [], messages: emptyMessages() }],
        inhibition: [],
      })
    if (kind === 'SILENCE')
      Object.assign(next, {
        reason: '',
        typeIds: [],
        startsAt: new Date().toISOString(),
        durationSeconds: 3600,
        periodSeconds: null,
        endsAt: null,
      })
    leave(() => edit(next))
  }
  return (
    <section className="alerts-page" data-deployment={catalog.data?.deployment}>
      <header className="alerts-heading">
        <div>
          <p>
            {t('nav.settings')} / {t('alerts.configuration')}
          </p>
          <h1>{t('alerts.configuration')}</h1>
        </div>
        <span className="alert-clock">
          {t('alerts.refreshed')} <Time value={catalog.data?.refreshedAt} />
        </span>
      </header>
      {catalog.isError && <p role="alert">{t('alerts.unavailable')}</p>}
      {cloud && <p className="alert-note">{t('alerts.cloudSettings')}</p>}
      <div className="alert-tabs" role="tablist" aria-label={t('alerts.configuration')}>
        {(!external
          ? cloud
            ? ['RULE', 'SUBSCRIPTION', 'SILENCE']
            : ['RULE', 'SILENCE']
          : ['RULE', 'SUBSCRIPTION', 'RECEIVER', 'SILENCE']
        ).map((v) => (
          <button
            key={v}
            role="tab"
            aria-selected={(editingInhibition ? 'SILENCE' : kind) === v}
            onClick={() =>
              leave(() => {
                edit(null)
                setKind(v)
              })
            }
          >
            {t(`alerts.kinds.${v}`)}
          </button>
        ))}
      </div>
      {!form && !(cloud && kind === 'SUBSCRIPTION') && (
        <div className="alerts-toolbar">
          <div>
            <h2>{t(`alerts.kinds.${kind}`)}</h2>
            <p>{t(kind === 'SUBSCRIPTION' ? 'alerts.routesNote' : 'alerts.configurationNote')}</p>
          </div>
          <Button disabled={!catalog.data || busy} onClick={create}>
            <Plus aria-hidden="true" className="h-3.5 w-3.5" />
            {t('alerts.create')}
          </Button>
        </div>
      )}
      {cloud && kind === 'SUBSCRIPTION' && (
        <div className="alert-panel alert-managed-route">
          <h2>{t('alerts.managedRoutes')}</h2>
          <p>{t('alerts.managedRoutesNote')}</p>
        </div>
      )}
      {(error || rows.isError) && <p role="alert">{t('alerts.refused')}</p>}
      {notice && <p role="status">{t(`alerts.${notice}`)}</p>}
      <div className={form ? 'alert-editor-container' : 'alert-config-list'}>
        {!form && !(cloud && kind === 'SUBSCRIPTION') && (
          <ConfigTable
            kind={kind}
            rows={rows.data?.pages.flatMap((p) => p.rows) ?? []}
            catalog={catalog.data}
            loading={rows.isPending}
            onEdit={(r) => edit(r)}
          />
        )}
        {!form && rows.hasNextPage && (
          <Button variant="outline" onClick={() => void rows.fetchNextPage()}>
            {t('alerts.more')}
          </Button>
        )}
        {!form && kind === 'SILENCE' && external && (
          <section className="alert-inhibition-section">
            <div className="alerts-toolbar">
              <div>
                <h2>{t('alerts.inhibitionRules')}</h2>
                <p>{t('alerts.inhibitionRoutesNote')}</p>
              </div>
            </div>
            <div className="alert-table-wrap">
              <table>
                <thead>
                  <tr>
                    {['route', 'inhibition', 'dependentType', 'state', 'actions'].map((k) => (
                      <th key={k}>{t(`alerts.${k}`)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inhibitionRoutes.data?.pages
                    .flatMap((p) => p.rows)
                    .flatMap((r) =>
                      (r.inhibition?.length
                        ? r.inhibition
                        : [{ rootType: '', dependentType: '' }]
                      ).map((edge) => (
                        <tr key={`${r.id}-${edge.rootType}-${edge.dependentType}`}>
                          <td>{r.name}</td>
                          <td>
                            {edge.rootType
                              ? t(`alerts.types.${edge.rootType}`, { defaultValue: edge.rootType })
                              : '—'}
                          </td>
                          <td>
                            {edge.dependentType
                              ? t(`alerts.types.${edge.dependentType}`, {
                                  defaultValue: edge.dependentType,
                                })
                              : '—'}
                          </td>
                          <td>
                            {t(r.enabled && edge.rootType ? 'alerts.enabled' : 'alerts.disabled')}
                          </td>
                          <td>
                            <button
                              className="alert-table-action"
                              onClick={() => {
                                setKind('SUBSCRIPTION')
                                setEditingInhibition(true)
                                edit(r)
                              }}
                            >
                              {t('alerts.configureInhibition')}
                            </button>
                          </td>
                        </tr>
                      )),
                    )}
                </tbody>
              </table>
            </div>
            {inhibitionRoutes.isError && <p role="alert">{t('alerts.unavailable')}</p>}
            {inhibitionRoutes.hasNextPage && (
              <Button variant="outline" onClick={() => void inhibitionRoutes.fetchNextPage()}>
                {t('alerts.more')}
              </Button>
            )}
          </section>
        )}
        {form && (
          <>
            <div className="alert-editor-head">
              <button
                className="alert-back"
                onClick={() =>
                  leave(() => {
                    edit(null)
                    if (editingInhibition) setKind('SILENCE')
                  })
                }
              >
                <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
                {t(`alerts.kinds.${editingInhibition ? 'SILENCE' : kind}`)}
              </button>
              <h2>
                {t(
                  editingInhibition
                    ? 'alerts.configureInhibition'
                    : `alerts.editorTitles.${kind}.${form.etag ? 'edit' : 'create'}`,
                )}
              </h2>
              <span className={`alert-state ${dirty ? 'alert-state--warning' : ''}`}>
                {t(dirty ? 'alerts.dirty' : form.etag ? 'alerts.savedLabel' : 'alerts.notSaved')}
              </span>
            </div>
            {editingInhibition ? (
              <form
                className="alert-panel alert-editor"
                onSubmit={(event) => {
                  event.preventDefault()
                  void save()
                }}
              >
                <p className="alert-note">
                  {t('alerts.route')}: {form.name}
                </p>
                <fieldset disabled={busy}>
                  <InhibitionEditor form={form} update={update} types={catalog.data?.types ?? []} />
                </fieldset>
                <div className="alert-actions">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      leave(() => {
                        edit(null)
                        setKind('SILENCE')
                      })
                    }
                  >
                    {t('alerts.close')}
                  </Button>
                  <Button type="submit" disabled={busy || !dirty}>
                    {t('alerts.saveEffective')}
                  </Button>
                </div>
              </form>
            ) : (
              <form
                className="alert-panel alert-editor"
                onSubmit={(e) => {
                  e.preventDefault()
                  void save()
                }}
              >
                <fieldset disabled={busy}>
                  {kind !== 'SILENCE' && kind !== 'SUBSCRIPTION' && (
                    <Field label={t('alerts.name')} wide={kind === 'RULE'}>
                      <input
                        required
                        value={form.name ?? ''}
                        maxLength={128}
                        onChange={(e) => update({ name: e.target.value })}
                      />
                    </Field>
                  )}
                  {kind === 'RULE' && (
                    <>
                      <Field label={t('alerts.type')} wide>
                        <AlertSelect
                          value={form.typeId}
                          onChange={(e) => {
                            const type = catalog.data!.types.find((v) => v.id === e.target.value)!
                            update({
                              typeId: type.id,
                              typeVersion: type.version,
                              resourceKinds: type.resourceKinds,
                              parameters: Object.fromEntries(
                                type.parameters.map((p) => [p.name, p.defaultValue]),
                              ),
                            })
                          }}
                        >
                          {catalog.data?.types.map((v) => (
                            <option key={v.id} value={v.id}>
                              {t(`alerts.types.${v.id}`, { defaultValue: v.id })}
                              {!v.inputAvailable ? ` · ${t('alerts.inputUnavailable')}` : ''}
                            </option>
                          ))}
                        </AlertSelect>
                      </Field>
                      <div className="alert-note alert-note--info">
                        <strong>{t('alerts.trigger')}</strong>{' '}
                        {catalog.data?.types.find((v) => v.id === form.typeId)?.condition}
                        <br />
                        <strong>{t('alerts.recovered')}</strong>{' '}
                        {catalog.data?.types.find((v) => v.id === form.typeId)?.recovery}
                      </div>
                      <ResourceScopeFields form={form} update={update} />
                      <h3 className="alert-form-section">{t('alerts.filterSeverity')}</h3>
                      <Field label={t('alerts.typeDefault')}>
                        <input
                          readOnly
                          value={
                            catalog.data?.types.find((v) => v.id === form.typeId)?.severity ?? ''
                          }
                        />
                      </Field>
                      <Field label={t('alerts.severityLabel')}>
                        <AlertSelect
                          value={form.severity}
                          onChange={(e) => update({ severity: e.target.value })}
                        >
                          {['DEFAULT', 'CRITICAL', 'MAJOR', 'MINOR', 'WARNING'].map((v) => (
                            <option key={v} value={v}>
                              {t(`alerts.severity.${v}`)}
                            </option>
                          ))}
                        </AlertSelect>
                      </Field>
                      <div className="alert-effective-level">
                        <span>{t('alerts.effectiveSeverity')}</span>
                        <Severity
                          value={
                            form.severity && form.severity !== 'DEFAULT'
                              ? form.severity
                              : (catalog.data?.types.find((v) => v.id === form.typeId)?.severity ??
                                'INDETERMINATE')
                          }
                        />
                        <small>
                          {t(
                            form.severity && form.severity !== 'DEFAULT'
                              ? 'alerts.ruleOverride'
                              : 'alerts.followsDefault',
                          )}
                        </small>
                      </div>
                      {catalog.data?.types
                        .find((v) => v.id === form.typeId)
                        ?.parameters.map((p) => (
                          <Field
                            key={p.name}
                            label={`${t(`alerts.parameters.${p.name}`, { defaultValue: p.name })} (${p.unit})`}
                          >
                            <input
                              type="number"
                              min={p.minimum}
                              max={p.maximum}
                              step={p.kind === 'DECIMAL' ? 'any' : 1}
                              required
                              value={form.parameters?.[p.name] ?? p.defaultValue}
                              onChange={(e) =>
                                update({
                                  parameters: {
                                    ...form.parameters,
                                    [p.name]: Number(e.target.value),
                                  },
                                })
                              }
                            />
                          </Field>
                        ))}
                    </>
                  )}
                  {kind !== 'RECEIVER' && kind !== 'RULE' && kind !== 'SUBSCRIPTION' && (
                    <>
                      <label className="alert-check">
                        <input
                          type="checkbox"
                          checked={form.allResources ?? true}
                          onChange={(e) =>
                            update({
                              allResources: e.target.checked,
                              resources: e.target.checked ? [] : form.resources,
                            })
                          }
                        />
                        {t('alerts.allResources')}
                      </label>
                      {!form.allResources && <ResourcePicker form={form} update={update} />}
                    </>
                  )}
                  {kind === 'RECEIVER' && (
                    <ReceiverFields
                      form={form}
                      update={update}
                      policies={catalog.data?.channelPolicies}
                    />
                  )}
                  {kind === 'SILENCE' && (
                    <>
                      <Field label={t('alerts.silenceDescription')}>
                        <textarea
                          required
                          maxLength={1024}
                          value={form.reason ?? ''}
                          onChange={(e) => update({ reason: e.target.value })}
                        />
                      </Field>
                      <Field label={t('alerts.startsAt')}>
                        <input
                          required
                          value={form.startsAt ?? ''}
                          onChange={(e) => update({ startsAt: e.target.value })}
                        />
                      </Field>
                      <Field label={t('alerts.duration')}>
                        <input
                          type="number"
                          min={1}
                          max={604800}
                          value={form.durationSeconds}
                          onChange={(e) => update({ durationSeconds: Number(e.target.value) })}
                        />
                      </Field>
                      <Field label={t('alerts.period')}>
                        <input
                          type="number"
                          min={1}
                          max={31536000}
                          value={form.periodSeconds ?? ''}
                          onChange={(e) =>
                            update({
                              periodSeconds: e.target.value ? Number(e.target.value) : null,
                            })
                          }
                        />
                      </Field>
                      <Field label={t('alerts.endsAt')}>
                        <input
                          value={form.endsAt ?? ''}
                          onChange={(e) => update({ endsAt: e.target.value || null })}
                        />
                      </Field>
                    </>
                  )}
                  {kind === 'SILENCE' && (
                    <Field label={t('alerts.matchTypes')}>
                      <AlertSelect
                        multiple
                        value={form.typeIds ?? []}
                        onChange={(e) =>
                          update({ typeIds: [...e.target.selectedOptions].map((o) => o.value) })
                        }
                      >
                        {catalog.data?.types.map((v) => (
                          <option key={v.id} value={v.id}>
                            {t(`alerts.types.${v.id}`, { defaultValue: v.id })}
                          </option>
                        ))}
                      </AlertSelect>
                      <small>{t('alerts.emptyMeansAll')}</small>
                    </Field>
                  )}
                  {kind === 'SUBSCRIPTION' && (
                    <>
                      <details className="alert-route-conditions" open={!form.etag}>
                        <summary>{t('alerts.routeConditions')}</summary>
                        <div className="alert-form-grid">
                          <Field label={t('alerts.name')} wide>
                            <input
                              required
                              maxLength={128}
                              value={form.name ?? ''}
                              onChange={(event) => update({ name: event.target.value })}
                            />
                          </Field>
                          <h3 className="alert-form-section">{t('alerts.matching')}</h3>
                          <ResourceScopeFields form={form} update={update} />
                          <Field label={t('alerts.matchTypes')}>
                            <AlertSelect
                              multiple
                              value={form.typeIds ?? []}
                              onChange={(e) =>
                                update({
                                  typeIds: [...e.target.selectedOptions].map((o) => o.value),
                                })
                              }
                            >
                              {catalog.data?.types.map((v) => (
                                <option key={v.id} value={v.id}>
                                  {t(`alerts.types.${v.id}`, { defaultValue: v.id })}
                                </option>
                              ))}
                            </AlertSelect>
                            <small>{t('alerts.emptyMeansAll')}</small>
                          </Field>
                          <Field label={t('alerts.matchSeverities')}>
                            <AlertSelect
                              multiple
                              value={form.severities ?? []}
                              onChange={(e) =>
                                update({
                                  severities: [...e.target.selectedOptions].map((o) => o.value),
                                })
                              }
                            >
                              {['CRITICAL', 'MAJOR', 'MINOR', 'WARNING'].map((v) => (
                                <option key={v}>{v}</option>
                              ))}
                            </AlertSelect>
                          </Field>
                          <section className="alert-match-preview">
                            <div className="alerts-toolbar">
                              <div>
                                <h3>{t('alerts.matchPreview')}</h3>
                                <p>{t('alerts.matchPreviewNote')}</p>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                  setMatchCandidate({
                                    form: {
                                      resourceKinds: form.resourceKinds,
                                      allResources: form.allResources,
                                      resources: form.resources,
                                      typeIds: form.typeIds,
                                      severities: form.severities,
                                      inhibition: form.inhibition,
                                    },
                                    serial: serial.current,
                                  })
                                }
                              >
                                {t('alerts.previewMatching')}
                              </Button>
                            </div>
                            {matching.isError && <p role="alert">{t('alerts.unavailable')}</p>}
                            {matchCandidate && matching.data && (
                              <>
                                <p>
                                  {t('alerts.matchCount', { count: matching.data.pages[0].total })}
                                </p>
                                <div className="alert-table-wrap">
                                  <table>
                                    <thead>
                                      <tr>
                                        <th>{t('alerts.resourceScope')}</th>
                                        <th>{t('alerts.type')}</th>
                                        <th>{t('alerts.severityLabel')}</th>
                                        <th>{t('alerts.notificationEligibility')}</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {matching.data.pages
                                        .flatMap((p) => p.rows)
                                        .map((r) => (
                                          <tr key={r.key}>
                                            <td>{r.resource.id}</td>
                                            <td>
                                              {t(`alerts.types.${r.typeId}`, {
                                                defaultValue: r.typeId,
                                              })}
                                            </td>
                                            <td>
                                              <Severity value={r.severity} />
                                            </td>
                                            <td>
                                              {t(
                                                r.silenced
                                                  ? 'alerts.silenced'
                                                  : r.inhibited
                                                    ? 'alerts.inhibited'
                                                    : 'alerts.previewEligible',
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                    </tbody>
                                  </table>
                                </div>
                                {matching.hasNextPage && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => void matching.fetchNextPage()}
                                  >
                                    {t('alerts.more')}
                                  </Button>
                                )}
                              </>
                            )}
                          </section>
                          <h3 className="alert-form-section">{t('alerts.notificationTargets')}</h3>
                          {['email', 'webhook'].map((channelType) => {
                            const channel = form.channels?.find(
                              (c) => c.channelType === channelType,
                            )
                            return (
                              <section key={channelType}>
                                <label className="alert-check">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(channel)}
                                    onChange={(e) =>
                                      update({
                                        channels: e.target.checked
                                          ? [
                                              ...(form.channels ?? []),
                                              {
                                                channelType,
                                                receivers: [],
                                                messages: emptyMessages(),
                                              },
                                            ]
                                          : form.channels?.filter(
                                              (c) => c.channelType !== channelType,
                                            ),
                                      })
                                    }
                                  />
                                  {channelType}
                                </label>
                                {channel && (
                                  <>
                                    <Field label={t('alerts.receivers')}>
                                      <AlertSelect
                                        multiple
                                        value={channel.receivers}
                                        onChange={(e) =>
                                          update({
                                            channels: form.channels?.map((c) =>
                                              c.channelType === channelType
                                                ? {
                                                    ...c,
                                                    receivers: [...e.target.selectedOptions].map(
                                                      (o) => o.value,
                                                    ),
                                                  }
                                                : c,
                                            ),
                                          })
                                        }
                                      >
                                        {channel.receivers
                                          .filter(
                                            (id) =>
                                              !receivers.data?.pages
                                                .flatMap((p) => p.rows)
                                                .some((r) => r.id === id),
                                          )
                                          .map((id) => (
                                            <option key={id} value={id}>
                                              {t('alerts.selectedReceiverPending', { id })}
                                            </option>
                                          ))}
                                        {receivers.data?.pages
                                          .flatMap((p) => p.rows)
                                          .filter((r) => r.transport?.channelType === channelType)
                                          .map((r) => (
                                            <option key={r.id} value={r.id}>
                                              {r.name}
                                            </option>
                                          ))}
                                      </AlertSelect>
                                    </Field>
                                  </>
                                )}
                              </section>
                            )
                          })}
                          {receivers.hasNextPage && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => void receivers.fetchNextPage()}
                            >
                              {t('alerts.moreReceivers')}
                            </Button>
                          )}

                          <h3 className="alert-form-section">{t('alerts.cadence')}</h3>
                          <Field label={t('alerts.groupBy')}>
                            <AlertSelect
                              multiple
                              value={form.groupBy ?? []}
                              onChange={(e) =>
                                update({
                                  groupBy: [...e.target.selectedOptions].map((o) => o.value),
                                })
                              }
                            >
                              {['RESOURCE', 'TYPE', 'RULE'].map((v) => (
                                <option key={v}>{v}</option>
                              ))}
                            </AlertSelect>
                          </Field>
                          {(
                            [
                              'initialWaitSeconds',
                              'changeIntervalSeconds',
                              'repeatIntervalSeconds',
                            ] as const
                          ).map((k) => (
                            <Field key={k} label={t(`alerts.${k}`)}>
                              <input
                                type="number"
                                min={k === 'initialWaitSeconds' ? 0 : 1}
                                max={k === 'initialWaitSeconds' ? 3600 : 86400}
                                value={form[k]}
                                onChange={(e) => update({ [k]: Number(e.target.value) })}
                              />
                            </Field>
                          ))}
                        </div>
                      </details>
                      <details className="alert-message-preview" open>
                        <summary>{t('alerts.preview')}</summary>
                        <div className="alert-preview-controls">
                          <AlertSelect
                            className="w-auto"
                            aria-label={t('alerts.previewKind')}
                            value={previewKind}
                            onChange={(e) => {
                              serial.current++
                              setPreviewKind(e.target.value)
                              setPreview(null)
                            }}
                          >
                            {['FAULT', 'REMINDER', 'RECOVERY', 'RECOVERY_SUMMARY'].map((v) => (
                              <option key={v} value={v}>
                                {t(`alerts.previewKinds.${v}`)}
                              </option>
                            ))}
                          </AlertSelect>
                          <AlertSelect
                            className="w-auto"
                            aria-label={t('alerts.previewFormat')}
                            value={previewFormat}
                            onChange={(e) => {
                              serial.current++
                              setPreviewFormat(e.target.value)
                              setPreview(null)
                            }}
                          >
                            {['text', 'html', 'webhook']
                              .filter((v) =>
                                form.channels?.some(
                                  (c) => c.channelType === (v === 'webhook' ? 'webhook' : 'email'),
                                ),
                              )
                              .map((v) => (
                                <option key={v} value={v}>
                                  {t(`alerts.previewFormats.${v}`)}
                                </option>
                              ))}
                          </AlertSelect>
                        </div>{' '}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void renderPreview()}
                        >
                          {t('alerts.renderPreview')}
                        </Button>
                        {preview && (
                          <>
                            <p>{t('alerts.exampleOnly')}</p>
                            <strong>{preview.subject}</strong>
                            {previewFormat === 'html' ? (
                              <iframe
                                title={t('alerts.preview')}
                                sandbox=""
                                srcDoc={preview.html}
                              />
                            ) : (
                              <pre className="alert-stack">
                                {previewFormat === 'webhook' ? preview.webhook : preview.text}
                              </pre>
                            )}
                          </>
                        )}
                        <MessagesEditor
                          form={form}
                          update={update}
                          channelType={previewFormat === 'webhook' ? 'webhook' : 'email'}
                        />
                      </details>
                    </>
                  )}
                  {kind === 'RULE' && (
                    <Field label={t('alerts.missingDataBehavior')} wide>
                      <input readOnly value={t('alerts.keepUnknown')} />
                    </Field>
                  )}
                  {kind !== 'SILENCE' && (
                    <label className="alert-check">
                      <input
                        type="checkbox"
                        checked={form.enabled ?? true}
                        onChange={(e) => update({ enabled: e.target.checked })}
                      />
                      {t('alerts.enabled')}
                    </label>
                  )}
                  {kind === 'RULE' && (
                    <section className="alert-rule-example">
                      <h3>{t('alerts.syntheticRuleExample')}</h3>
                      <p className="alert-note">{t('alerts.syntheticRuleNote')}</p>
                      <AlertSelect
                        aria-label={t('alerts.ruleSample')}
                        value={ruleSample}
                        onChange={(e) => {
                          serial.current++
                          setRuleSample(e.target.value)
                          setRuleResult(null)
                        }}
                      >
                        {['BAD', 'GOOD', 'MISSING'].map((v) => (
                          <option key={v} value={v}>
                            {t(`alerts.ruleSamples.${v}`)}
                          </option>
                        ))}
                      </AlertSelect>
                      <Button type="button" variant="outline" onClick={() => void previewRule()}>
                        {t('alerts.evaluateExample')}
                      </Button>
                      {ruleResult && (
                        <div role="status" className="alert-note">
                          <strong>{t(`alerts.exampleStates.${ruleResult.status}`)}</strong> ·{' '}
                          {t(`alerts.exampleQuality.${ruleResult.quality}`, {
                            defaultValue: ruleResult.quality,
                          })}{' '}
                          · <Severity value={ruleResult.severity} />
                          <small>
                            {t('alerts.virtualElapsed', {
                              count: ruleResult.virtualElapsedSeconds,
                            })}
                          </small>
                        </div>
                      )}
                    </section>
                  )}
                </fieldset>
                {kind === 'RECEIVER' && (
                  <div className="alert-test-panel">
                    <p>{t('alerts.testFixed')}</p>
                    {test && (
                      <p
                        role="status"
                        data-outcome={
                          result.data?.current === false
                            ? 'UNKNOWN'
                            : (testResult?.outcome ?? test.admission)
                        }
                      >
                        {result.data?.current === false
                          ? t('alerts.testResultMismatch')
                          : test.admission === 'SUBMITTING'
                            ? t('alerts.testSubmitting')
                            : testResult?.outcome === 'ACCEPTED'
                              ? t(dirty ? 'alerts.testSuccessUnsaved' : 'alerts.testSuccessSaved')
                              : testResult?.stopped
                                ? t(
                                    testResult.outcome === 'UNKNOWN'
                                      ? 'alerts.testUnknown'
                                      : 'alerts.testFailed',
                                  )
                                : t(
                                    test.admission === 'UNKNOWN'
                                      ? 'alerts.testAdmissionUnknown'
                                      : 'alerts.testQueued',
                                  )}
                      </p>
                    )}
                    {form.transport?.channelType === 'email' && testTargets.length > 0 && (
                      <Field label={t('alerts.testRecipient')}>
                        <Select
                          disabled={busy}
                          value={testTarget}
                          onValueChange={(value) => {
                            serial.current++
                            setChosenTestTarget(value ?? '')
                            setTest(null)
                            setNotice('')
                          }}
                        >
                          <SelectTrigger aria-label={t('alerts.testRecipient')}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {testTargets.map((target) => (
                              <SelectItem key={target} value={target}>
                                {target}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <small>{t('alerts.singleTestTarget')}</small>
                      </Field>
                    )}

                    {result.isError && test && <p role="alert">{t('alerts.testQueryFailed')}</p>}
                  </div>
                )}
                {testResult?.diagnostic && (
                  <p className="alert-note">
                    {t(`alerts.phases.${testResult.diagnostic.phase}`, {
                      defaultValue: testResult.diagnostic.phase,
                    })}
                    {testResult.diagnostic.status ? ` · ${testResult.diagnostic.status}` : ''}
                  </p>
                )}
                <div className="alert-actions">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => leave(() => edit(null))}
                  >
                    {t('alerts.close')}
                  </Button>
                  {kind === 'RECEIVER' && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void sendTest()}
                    >
                      {t('alerts.sendTest')}
                    </Button>
                  )}
                  <Button type="submit" disabled={busy || !dirty}>
                    {t('alerts.saveEffective')}
                  </Button>
                  {form.etag && kind === 'SILENCE' && (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busy}
                      onClick={() =>
                        leave(() => {
                          void retire(form)
                        })
                      }
                    >
                      {t(kind === 'SILENCE' ? 'alerts.endSilence' : 'alerts.retire')}
                    </Button>
                  )}
                </div>
                {kind === 'SILENCE' && <p>{t('alerts.silenceNote')}</p>}
              </form>
            )}
          </>
        )}
      </div>
      <Dialog
        open={blocked}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setPendingLeave(null)
            if (blocker.status === 'blocked') blocker.reset()
          }
        }}
      >
        <DialogContent showCloseButton={false} className="sm:max-w-xl">
          <DialogTitle>{t('alerts.unsaved')}</DialogTitle>
          <DialogDescription>{t('alerts.unsavedNote')}</DialogDescription>
          {error && (
            <p role="alert" className="alert-error">
              {t('alerts.refused')}
            </p>
          )}
          <div className="alert-actions">
            <Button
              disabled={busy}
              onClick={() => {
                setPendingLeave(null)
                if (blocker.status === 'blocked') blocker.reset()
              }}
            >
              {t('alerts.keepEditing')}
            </Button>
            <Button variant="outline" disabled={busy} onClick={discard}>
              {t('alerts.discard')}
            </Button>
            <Button disabled={busy} onClick={() => void saveLeave()}>
              {t('alerts.saveLeave')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
function Field({
  label,
  children,
  wide = false,
}: {
  label: string
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <label className={`alert-field${wide ? ' alert-field--wide' : ''}`}>
      <span>{label}</span>
      {children}
    </label>
  )
}
function MessagesEditor({
  form,
  update,
  channelType,
}: {
  form: AlertForm
  update: (patch: Partial<AlertForm> | ((current: AlertForm) => Partial<AlertForm>)) => void
  channelType: string
}) {
  const { t } = useTranslation()
  const channel = form.channels?.find((entry) => entry.channelType === channelType)
  if (!channel) return null
  return (
    <details className="alert-message-text">
      <summary>{t('alerts.customText')}</summary>
      <div className="alert-form-grid">
        {(Object.keys(emptyMessages()) as (keyof Messages)[]).map((key) => (
          <Field key={key} label={t(`alerts.messages.${key}`)} wide>
            <textarea
              maxLength={key.startsWith('title') ? 64 : 1024}
              value={channel.messages[key]}
              onChange={(event) =>
                update((current) => ({
                  channels: current.channels?.map((entry) =>
                    entry.channelType === channelType
                      ? { ...entry, messages: { ...entry.messages, [key]: event.target.value } }
                      : entry,
                  ),
                }))
              }
            />
          </Field>
        ))}
      </div>
    </details>
  )
}

function ReceiverFields({
  form,
  update,
  policies,
}: {
  form: AlertForm
  update: (patch: Partial<AlertForm> | ((current: AlertForm) => Partial<AlertForm>)) => void
  policies?: Catalog['channelPolicies']
}) {
  const { t } = useTranslation()
  const transport = form.transport!
  function patch(p: Partial<NonNullable<AlertForm['transport']>>) {
    update((current) => ({
      transport: { ...current.transport!, ...p },
      ...(p.authentication !== undefined || p.username !== undefined || p.principal !== undefined
        ? { secret: undefined }
        : {}),
      ...(p.trust === 'SYSTEM' ? { privateCa: undefined } : {}),
    }))
  }
  return (
    <>
      <Field label={t('alerts.channel')}>
        <AlertSelect
          value={transport.channelType}
          disabled={Boolean(form.etag)}
          onChange={(e) =>
            update({
              transport:
                e.target.value === 'email'
                  ? {
                      channelType: 'email',
                      host: '',
                      port: 465,
                      encryption: 'IMPLICIT_TLS',
                      authentication: 'NONE',
                      trust: 'SYSTEM',
                      from: '',
                      recipients: [],
                    }
                  : { channelType: 'webhook', authentication: 'NONE', trust: 'SYSTEM' },
              endpoint: '',
              secret: '',
              privateCa: '',
              retainMaterial: false,
            })
          }
        >
          <option value="email">Email</option>
          <option value="webhook">Webhook</option>
        </AlertSelect>
      </Field>
      {transport.channelType === 'email' ? (
        <>
          <Field label={t('alerts.smtpHost')}>
            <input
              required
              value={transport.host ?? ''}
              onChange={(e) => patch({ host: e.target.value })}
            />
          </Field>
          <Field label={t('alerts.port')}>
            <input
              type="number"
              min={1}
              max={65535}
              value={transport.port}
              onChange={(e) => patch({ port: Number(e.target.value) })}
            />
          </Field>
          <Field label={t('alerts.encryption')}>
            <AlertSelect
              value={transport.encryption}
              onChange={(e) => patch({ encryption: e.target.value })}
            >
              <option value="IMPLICIT_TLS">TLS</option>
              <option value="STARTTLS_REQUIRED">STARTTLS</option>
            </AlertSelect>
          </Field>
        </>
      ) : (
        <Field label={t('alerts.endpoint')}>
          <input
            type="url"
            value={form.endpoint ?? ''}
            placeholder={
              transport.origin
                ? t('alerts.endpointStored', { origin: transport.origin })
                : 'https://'
            }
            onChange={(e) => update({ endpoint: e.target.value })}
          />
          <small>{t('alerts.endpointPrivate')}</small>
        </Field>
      )}
      <Field label={t('alerts.authentication')}>
        <AlertSelect
          value={transport.authentication}
          onChange={(e) =>
            patch({
              authentication: e.target.value,
              username: e.target.value === 'NONE' ? null : transport.username,
            })
          }
        >
          {(transport.channelType === 'email'
            ? ['NONE', 'PLAIN', 'LOGIN']
            : ['NONE', 'BEARER', 'HMAC_SHA256']
          ).map((v) => (
            <option key={v}>{v}</option>
          ))}
        </AlertSelect>
      </Field>
      {transport.authentication !== 'NONE' &&
        (transport.channelType === 'email' ? (
          <Field label={t('alerts.username')}>
            <input
              required
              value={transport.username ?? ''}
              onChange={(e) => patch({ username: e.target.value })}
            />
          </Field>
        ) : (
          <Field label={t('alerts.principal')}>
            <input
              required
              value={transport.principal ?? ''}
              onChange={(e) => patch({ principal: e.target.value })}
            />
          </Field>
        ))}
      <Field label={t('alerts.trust')}>
        <AlertSelect value={transport.trust} onChange={(e) => patch({ trust: e.target.value })}>
          <option value="SYSTEM">{t('alerts.systemTrust')}</option>
          <option value="PRIVATE_CA">{t('alerts.privateTrust')}</option>
        </AlertSelect>
      </Field>
      {form.etag && (
        <label className="alert-check">
          <input
            type="checkbox"
            checked={form.retainMaterial ?? false}
            onChange={(e) =>
              update({ retainMaterial: e.target.checked, secret: undefined, privateCa: undefined })
            }
          />
          {t('alerts.retainPrivate')}
        </label>
      )}
      {!form.retainMaterial && (
        <>
          {transport.authentication !== 'NONE' && (
            <Field label={t('alerts.secret')}>
              <input
                type="password"
                autoComplete="new-password"
                required
                value={form.secret ?? ''}
                onChange={(e) => update({ secret: e.target.value })}
              />
            </Field>
          )}
          {transport.trust === 'PRIVATE_CA' && (
            <Field label={t('alerts.privateCa')}>
              <textarea
                required
                value={form.privateCa ?? ''}
                onChange={(e) => update({ privateCa: e.target.value })}
              />
            </Field>
          )}
        </>
      )}
      <p className="alert-note">{t('alerts.replacePrivateNote')}</p>
      {transport.channelType === 'email' && (
        <>
          {' '}
          <Field label={t('alerts.from')}>
            <input
              type="email"
              required
              value={transport.from ?? ''}
              onChange={(e) => patch({ from: e.target.value })}
            />
          </Field>
          <Field label={t('alerts.envelopeFrom')}>
            <input type="email" readOnly value={transport.from ?? ''} />
            <small>{t('alerts.envelopeFromShared')}</small>
          </Field>
          <Field label={t('alerts.to')}>
            <textarea
              required
              value={transport.recipients?.join('\n') ?? ''}
              onChange={(e) => patch({ recipients: e.target.value.split('\n').filter(Boolean) })}
            />
            <small>{t('alerts.singleTestTarget')}</small>
          </Field>
        </>
      )}
      <Field label={t('alerts.timeout')}>
        <input readOnly value={policies?.[transport.channelType]?.timeoutSeconds ?? ''} />
      </Field>
      <Field label={t('alerts.attemptLimit')}>
        <input readOnly value={policies?.[transport.channelType]?.attempts ?? ''} />
      </Field>
      <p className="alert-note">
        {t('alerts.fixedPolicy', {
          age: policies?.[transport.channelType]?.maximumAgeSeconds ?? '—',
          delays: policies?.[transport.channelType]?.retryDelaysSeconds.join(' / ') ?? '—',
        })}
      </p>
    </>
  )
}

function ResourceScopeFields({
  form,
  update,
}: {
  form: AlertForm
  update: (patch: Partial<AlertForm>) => void
}) {
  const { t } = useTranslation()
  return (
    <>
      <Field label={t('alerts.resourceScope')} wide>
        <AlertSelect
          aria-label={t('alerts.resourceScope')}
          value={form.allResources === false ? 'selected' : 'all'}
          onChange={(e) =>
            update({
              allResources: e.target.value === 'all',
              resources: e.target.value === 'all' ? [] : form.resources,
            })
          }
        >
          <option value="all">{t('alerts.allResources')}</option>
          <option value="selected">{t('alerts.resourceSelection')}</option>
        </AlertSelect>
      </Field>
      {form.allResources === false && <ResourcePicker form={form} update={update} />}
    </>
  )
}

function ResourcePicker({
  form,
  update,
}: {
  form: AlertForm
  update: (patch: Partial<AlertForm>) => void
}) {
  const apiFetch = useAuthStore((s) => s.apiFetch)
  const { t } = useTranslation()
  const [kind, setKind] = useState(
    form.resourceKinds?.find((k) => ['source', 'pipeline'].includes(k)) ?? 'pipeline',
  )
  const allowed = (form.resourceKinds ?? ['pipeline', 'source']).filter((k) =>
    ['pipeline', 'source'].includes(k),
  )
  const query = useInfiniteQuery({
    enabled: allowed.length > 0,
    queryKey: ['alerts', 'resources', kind],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      alertCall<AlertPage<{ kind: string; id: string; incarnation: string }>>(
        apiFetch,
        'resources',
        { kind, cursor: pageParam, limit: 100 },
        signal,
      ),
    getNextPageParam: (p) => p.nextCursor ?? undefined,
  })
  if (!allowed.length)
    return <p className="alert-note">{t('alerts.resourceCapabilityUnavailable')}</p>
  const selected = form.resources ?? []
  const options = [...selected, ...(query.data?.pages.flatMap((p) => p.rows) ?? [])].filter(
    (r, i, all) => all.findIndex((other) => JSON.stringify(other) === JSON.stringify(r)) === i,
  )
  return (
    <Field label={t('alerts.resourceSelection')} wide>
      <AlertSelect
        aria-label={t('alerts.resourceKind')}
        value={kind}
        onChange={(e) => setKind(e.target.value)}
      >
        {(form.resourceKinds ?? ['pipeline', 'source'])
          .filter((k) => ['pipeline', 'source'].includes(k))
          .map((k) => (
            <option key={k}>{k}</option>
          ))}
      </AlertSelect>
      <AlertSelect
        multiple
        aria-label={t('alerts.resourceSelection')}
        value={selected.map((r) => JSON.stringify(r))}
        onChange={(e) =>
          update({
            resources: [...e.target.selectedOptions].map(
              (o) => JSON.parse(o.value) as { kind: string; id: string; incarnation: string },
            ),
          })
        }
      >
        {options.map((r) => (
          <option key={JSON.stringify(r)} value={JSON.stringify(r)}>
            {r.kind} / {r.id}
          </option>
        ))}
      </AlertSelect>
      {query.isError && <small role="alert">{t('alerts.unavailable')}</small>}
      {query.hasNextPage && (
        <Button type="button" variant="outline" onClick={() => void query.fetchNextPage()}>
          {t('alerts.more')}
        </Button>
      )}
      <small>{t('alerts.resourceIdentity')}</small>
    </Field>
  )
}

function ConfigTable({
  kind,
  rows,
  catalog,
  loading,
  onEdit,
}: {
  kind: string
  rows: AlertForm[]
  catalog?: Catalog
  loading: boolean
  onEdit: (row: AlertForm) => void
}) {
  const { t } = useTranslation()
  const columns =
    kind === 'RULE'
      ? ['ruleType', 'resourceScope', 'typeDefault', 'effectiveSeverity', 'state', 'actions']
      : kind === 'SUBSCRIPTION'
        ? ['route', 'matching', 'notificationTargets', 'cadence', 'state', 'actions']
        : kind === 'RECEIVER'
          ? ['nameChannel', 'target', 'state', 'currentTest', 'actions']
          : ['reason', 'resourceScope', 'startsAt', 'duration', 'state', 'actions']
  return (
    <div className="alert-table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th scope="col" key={c}>
                {t(c === 'reason' ? 'alerts.silenceDescription' : `alerts.${c}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {!rows.length && (
            <tr>
              <td className="alert-empty" colSpan={columns.length}>
                {t(loading ? 'alerts.loading' : 'alerts.noConfiguration')}
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <strong>{r.name ?? r.reason}</strong>
                <small>
                  {r.typeId ? (
                    t(`alerts.types.${r.typeId}`, { defaultValue: r.typeId })
                  ) : r.transport?.channelType === 'email' ? (
                    <>
                      <Mail className="h-3 w-3" /> Email · SMTP TLS
                    </>
                  ) : r.transport?.channelType === 'webhook' ? (
                    <>
                      <Webhook className="h-3 w-3" /> Webhook · HTTPS
                    </>
                  ) : (
                    ''
                  )}
                </small>
              </td>
              {kind === 'RULE' && (
                <>
                  <td>
                    {r.allResources
                      ? t('alerts.allResources')
                      : r.resources?.map((v) => v.id).join(', ')}
                  </td>
                  <td>
                    <Severity
                      value={
                        catalog?.types.find((v) => v.id === r.typeId)?.severity ?? 'INDETERMINATE'
                      }
                    />
                  </td>
                  <td>
                    <Severity
                      value={
                        r.severity && r.severity !== 'DEFAULT'
                          ? r.severity
                          : (catalog?.types.find((v) => v.id === r.typeId)?.severity ??
                            'INDETERMINATE')
                      }
                    />
                    <small>
                      {t(
                        r.severity && r.severity !== 'DEFAULT'
                          ? 'alerts.ruleOverride'
                          : 'alerts.followsDefault',
                      )}
                    </small>
                  </td>
                </>
              )}
              {kind === 'SUBSCRIPTION' && (
                <>
                  <td>
                    {r.typeIds?.length
                      ? r.typeIds.map((v) => t(`alerts.types.${v}`, { defaultValue: v })).join(', ')
                      : t('alerts.all')}
                    <small>{r.severities?.join(' / ')}</small>
                  </td>
                  <td>
                    {r.channels?.map((c) => (
                      <div key={c.channelType}>
                        {c.channelType}
                        <small>
                          {c.receivers.length} {t('alerts.receivers')}
                        </small>
                      </div>
                    ))}
                  </td>
                  <td>
                    {t('alerts.initialWaitSeconds')}: {r.initialWaitSeconds}
                    <small>
                      {t('alerts.changeIntervalSeconds')}: {r.changeIntervalSeconds}
                      <br />
                      {t('alerts.repeatIntervalSeconds')}: {r.repeatIntervalSeconds}
                    </small>
                  </td>
                </>
              )}
              {kind === 'RECEIVER' && (
                <td>
                  {r.transport?.recipients?.join(', ') ?? r.transport?.origin}
                  <small>
                    {r.transport?.channelType === 'webhook' && t('alerts.endpointPrivate')}
                  </small>
                </td>
              )}
              {kind === 'SILENCE' && (
                <>
                  <td>
                    {r.allResources
                      ? t('alerts.allResources')
                      : r.resources?.map((v) => v.id).join(', ')}
                  </td>
                  <td>
                    <Time value={r.startsAt} />
                  </td>
                  <td>
                    {r.durationSeconds} s
                    <small>{r.periodSeconds ? t('alerts.periodic') : t('alerts.once')}</small>
                  </td>
                </>
              )}
              <td>
                <span
                  className={`alert-state ${r.enabled === false || (kind === 'SILENCE' && !r.active) ? '' : 'alert-state--good'}`}
                >
                  {t(
                    r.enabled === false
                      ? 'alerts.disabled'
                      : kind === 'SILENCE'
                        ? 'alerts.scheduled'
                        : 'alerts.enabled',
                  )}
                </span>
              </td>
              {kind === 'RECEIVER' && (
                <td>
                  {t('alerts.noCurrentTest')}
                  <small>{t('alerts.testInEditor')}</small>
                </td>
              )}
              <td>
                <button className="alert-table-action" onClick={() => onEdit(r)}>
                  {t('alerts.edit')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function InhibitionEditor({
  form,
  update,
  types,
}: {
  form: AlertForm
  update: (patch: Partial<AlertForm> | ((current: AlertForm) => Partial<AlertForm>)) => void
  types: Catalog['types']
}) {
  const { t } = useTranslation()
  const enabled = Boolean(form.inhibition?.length)
  const [disabledDraft, setDisabledDraft] = useState(
    form.inhibition?.length
      ? form.inhibition
      : [{ rootType: 'cluster.storage-unavailable', dependentType: 'pipeline.failed' }],
  )
  const edges = enabled ? form.inhibition! : disabledDraft
  function change(index: number, patch: { rootType?: string; dependentType?: string }) {
    if (enabled)
      update((current) => ({
        inhibition: (current.inhibition ?? []).map((edge, i) =>
          i === index ? { ...edge, ...patch } : edge,
        ),
      }))
    else
      setDisabledDraft((current) =>
        current.map((edge, i) => (i === index ? { ...edge, ...patch } : edge)),
      )
  }
  function remove(index: number) {
    if (enabled) {
      if (edges.length === 1) setDisabledDraft([])
      update((current) => ({
        inhibition: (current.inhibition ?? []).filter((_, i) => i !== index),
      }))
    } else setDisabledDraft((current) => current.filter((_, i) => i !== index))
  }
  return (
    <section className="alert-inhibition-editor">
      {edges.map((edge, index) => (
        <div key={index} className="alert-inhibition-edge">
          <Field label={`${t('alerts.inhibition')} ${index + 1}`} wide>
            <AlertSelect
              value={edge.rootType}
              onChange={(e) =>
                change(index, {
                  rootType: e.target.value,
                  ...(e.target.value === edge.dependentType ? { dependentType: '' } : {}),
                })
              }
            >
              <option value="">{t('alerts.selectType')}</option>
              {edge.rootType && !types.some((type) => type.id === edge.rootType) && (
                <option value={edge.rootType}>
                  {t(`alerts.types.${edge.rootType}`, { defaultValue: edge.rootType })}
                </option>
              )}
              {types.map((type) => (
                <option key={type.id} value={type.id}>
                  {t(`alerts.types.${type.id}`, { defaultValue: type.id })}
                </option>
              ))}
            </AlertSelect>
          </Field>
          <Field label={`${t('alerts.dependentType')} ${index + 1}`} wide>
            <AlertSelect
              value={edge.dependentType}
              onChange={(e) => change(index, { dependentType: e.target.value })}
            >
              <option value="">{t('alerts.selectType')}</option>
              {edge.dependentType && !types.some((type) => type.id === edge.dependentType) && (
                <option value={edge.dependentType}>
                  {t(`alerts.types.${edge.dependentType}`, { defaultValue: edge.dependentType })}
                </option>
              )}
              {types
                .filter((type) => type.id !== edge.rootType)
                .map((type) => (
                  <option key={type.id} value={type.id}>
                    {t(`alerts.types.${type.id}`, { defaultValue: type.id })}
                  </option>
                ))}
            </AlertSelect>
          </Field>
          {edges.length > 1 && (
            <Button type="button" variant="ghost" onClick={() => remove(index)}>
              {t('alerts.removeEdge')}
            </Button>
          )}
        </div>
      ))}
      <Field label={t('alerts.matchingScope')} wide>
        <input readOnly value={t('alerts.inhibitionScope')} />
      </Field>
      <p className="alert-note">{t('alerts.inhibitionLifecycle')}</p>
      <label className="alert-check">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => {
            if (event.target.checked) update({ inhibition: disabledDraft })
            else {
              setDisabledDraft(form.inhibition ?? [])
              update({ inhibition: [] })
            }
          }}
        />
        {t('alerts.enableInhibition')}
      </label>
      {!enabled && <p className="alert-note">{t('alerts.disabledInhibitionNote')}</p>}
      <Button
        type="button"
        variant="outline"
        disabled={edges.length >= 64}
        onClick={() => {
          if (enabled)
            update((current) => ({
              inhibition: [...(current.inhibition ?? []), { rootType: '', dependentType: '' }],
            }))
          else setDisabledDraft((current) => [...current, { rootType: '', dependentType: '' }])
        }}
      >
        {t('alerts.addEdge')}
      </Button>
    </section>
  )
}
