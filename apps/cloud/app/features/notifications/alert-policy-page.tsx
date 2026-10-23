import { BellRing, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { AlertPolicy, AlertPolicyInput, EventSeverity } from '../../service/cloud-api'

import { CloudApiError, cloudApi } from '../../service/cloud-api'
import { useCloudAppState } from '../../state/cloud-app-state'

interface FormState {
  name: string
  eventTypes: string
  minSeverity: EventSeverity
  recipients: string
  cooldownSeconds: string
  quietHoursStart: string
  quietHoursEnd: string
  timezone: string
  enabled: boolean
}

const emptyForm: FormState = {
  name: '',
  eventTypes: '*',
  minSeverity: 'INFO',
  recipients: '',
  cooldownSeconds: '300',
  quietHoursStart: '',
  quietHoursEnd: '',
  timezone: 'UTC',
  enabled: true,
}

function parseList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function lastSegment(value: string): string {
  const index = value.lastIndexOf(',')
  return (index >= 0 ? value.slice(index + 1) : value).trim()
}

function toInput(form: FormState): AlertPolicyInput {
  return {
    name: form.name.trim(),
    enabled: form.enabled,
    eventTypes: parseList(form.eventTypes),
    minSeverity: form.minSeverity,
    recipients: parseList(form.recipients),
    channel: 'EMAIL',
    cooldownSeconds: Number.parseInt(form.cooldownSeconds, 10) || 0,
    quietHoursStart: form.quietHoursStart.trim(),
    quietHoursEnd: form.quietHoursEnd.trim(),
    timezone: form.timezone.trim() || 'UTC',
  }
}

function toForm(policy: AlertPolicy): FormState {
  return {
    name: policy.name,
    eventTypes: policy.eventTypes.join(', '),
    minSeverity: policy.minSeverity,
    recipients: policy.recipients.join(', '),
    cooldownSeconds: String(policy.cooldownSeconds),
    quietHoursStart: policy.quietHoursStart ?? '',
    quietHoursEnd: policy.quietHoursEnd ?? '',
    timezone: policy.timezone,
    enabled: policy.enabled,
  }
}

export function AlertPolicyPage() {
  const { t } = useTranslation()
  const { activeOrganization } = useCloudAppState()
  const organizationId = activeOrganization?.id
  const [policies, setPolicies] = useState<AlertPolicy[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validation, setValidation] = useState<string | null>(null)
  const [typeOptions, setTypeOptions] = useState<string[]>([])
  const [isTypeListOpen, setIsTypeListOpen] = useState(false)
  const loadSequence = useRef(0)
  const typeRequest = useRef(0)

  const load = useCallback(async () => {
    const sequence = ++loadSequence.current
    if (!organizationId) {
      setPolicies([])
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const nextPolicies = await cloudApi.alertPolicies(organizationId)
      if (sequence === loadSequence.current) setPolicies(nextPolicies)
    } catch (loadError) {
      if (sequence === loadSequence.current) {
        setError(
          loadError instanceof CloudApiError && loadError.status === 403
            ? t('events.adminOnly')
            : t('events.loadError'),
        )
      }
    } finally {
      if (sequence === loadSequence.current) setIsLoading(false)
    }
  }, [organizationId, t])

  useEffect(() => {
    setPolicies([])
    setEditingId(null)
    setForm(emptyForm)
    setValidation(null)
    setError(null)
    setTypeOptions([])
    setIsTypeListOpen(false)
  }, [organizationId])

  useEffect(() => {
    void load()
    return () => {
      loadSequence.current += 1
    }
  }, [load])

  useEffect(() => {
    if (!organizationId || !isTypeListOpen) return
    const sequence = ++typeRequest.current
    const prefix = lastSegment(form.eventTypes)
    const timer = window.setTimeout(() => {
      void cloudApi
        .eventTypes(organizationId, prefix || undefined)
        .then((types) => {
          if (sequence === typeRequest.current) setTypeOptions(types)
        })
        .catch(() => {
          if (sequence === typeRequest.current) setTypeOptions([])
        })
    }, 200)
    return () => window.clearTimeout(timer)
  }, [form.eventTypes, isTypeListOpen, organizationId])

  const startCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setValidation(null)
    setError(null)
  }

  const startEdit = (policy: AlertPolicy) => {
    setEditingId(policy.id)
    setForm(toForm(policy))
    setValidation(null)
    setError(null)
  }

  const submit = async () => {
    if (!organizationId) return
    if (!form.name.trim()) {
      setValidation(t('events.validation.name'))
      return
    }
    if (parseList(form.recipients).length === 0) {
      setValidation(t('events.validation.recipients'))
      return
    }
    if (Boolean(form.quietHoursStart.trim()) !== Boolean(form.quietHoursEnd.trim())) {
      setValidation(t('events.validation.quietHours'))
      return
    }
    setValidation(null)
    setIsSaving(true)
    setError(null)
    try {
      if (editingId) {
        await cloudApi.updateAlertPolicy(organizationId, editingId, toInput(form))
      } else {
        await cloudApi.createAlertPolicy(organizationId, toInput(form))
      }
      setEditingId(null)
      setForm(emptyForm)
      await load()
    } catch (saveError) {
      setError(saveError instanceof CloudApiError ? saveError.message : t('events.errors.generic'))
    } finally {
      setIsSaving(false)
    }
  }

  const remove = async (policy: AlertPolicy) => {
    if (!organizationId) return
    if (!window.confirm(t('events.deleteConfirm'))) return
    try {
      await cloudApi.deleteAlertPolicy(organizationId, policy.id)
      await load()
    } catch (deleteError) {
      setError(
        deleteError instanceof CloudApiError ? deleteError.message : t('events.errors.generic'),
      )
    }
  }

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const selectType = (type: string) => {
    const index = form.eventTypes.lastIndexOf(',')
    const prefix = index >= 0 ? `${form.eventTypes.slice(0, index + 1)} ` : ''
    update('eventTypes', `${prefix}${type}, `)
    setIsTypeListOpen(false)
  }

  const selectedTypes = new Set(parseList(form.eventTypes))
  const typeSuggestions = isTypeListOpen
    ? typeOptions.filter((type) => !selectedTypes.has(type)).slice(0, 8)
    : []

  return (
    <div className="flex h-full flex-1 flex-col overflow-y-auto">
      <header className="flex shrink-0 items-center justify-between border-b border-black/[0.05] px-6 py-4 dark:border-white/[0.05]">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">
            <BellRing className="h-5 w-5 text-neutral-400" />
            {t('events.tabPolicies')}
          </h1>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            {t('events.policySubtitle', {
              organization: activeOrganization?.name ?? t('events.organizationFallback'),
            })}
          </p>
        </div>
        <button
          className="flex items-center gap-1.5 rounded-lg bg-neutral-900 px-2.5 py-1.5 text-xs text-white transition-colors hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          onClick={startCreate}
          type="button"
        >
          <Plus className="h-3.5 w-3.5" />
          {t('events.actions.create')}
        </button>
      </header>

      <div className="grid gap-4 p-6 lg:grid-cols-[1fr_380px]">
        <section className="space-y-2">
          {isLoading ? (
            <p className="text-xs text-neutral-500">{t('events.loading')}</p>
          ) : policies.length === 0 ? (
            <p className="text-xs text-neutral-500">{t('events.empty')}</p>
          ) : (
            policies.map((policy) => (
              <article
                className="rounded-xl border border-black/[0.06] p-3 dark:border-white/[0.06]"
                key={policy.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-xs font-semibold text-neutral-900 dark:text-white">
                      {policy.name}
                    </h2>
                    <p className="mt-1 font-mono text-[11px] text-neutral-500">
                      {policy.eventTypes.join(', ')} · ≥ {policy.minSeverity} · {policy.channel}
                    </p>
                    <p className="mt-1 truncate text-[11px] text-neutral-500">
                      {t('events.columns.recipients')}: {policy.recipients.join(', ')}
                    </p>
                    <p className="mt-1 text-[11px] text-neutral-400">
                      {t('events.columns.cooldown')}: {policy.cooldownSeconds}s ·{' '}
                      {t('events.columns.quietHours')}:{' '}
                      {policy.quietHoursStart && policy.quietHoursEnd
                        ? `${policy.quietHoursStart}–${policy.quietHoursEnd} (${policy.timezone})`
                        : '—'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${policy.enabled ? 'bg-emerald-500' : 'bg-neutral-400'}`}
                      title={
                        policy.enabled ? t('events.columns.enabled') : t('events.columns.enabled')
                      }
                    />
                    <button
                      className="text-[11px] text-neutral-500 underline-offset-2 hover:underline"
                      onClick={() => startEdit(policy)}
                      type="button"
                    >
                      {t('events.actions.edit')}
                    </button>
                    <button
                      aria-label={t('events.actions.delete')}
                      className="text-neutral-400 hover:text-red-600"
                      onClick={() => void remove(policy)}
                      type="button"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </section>

        <section className="space-y-3 rounded-xl border border-black/[0.06] p-4 dark:border-white/[0.06]">
          <h2 className="text-xs font-semibold text-neutral-900 dark:text-white">
            {editingId ? t('events.actions.edit') : t('events.actions.create')}
          </h2>
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
          {validation && <p className="text-xs text-amber-600 dark:text-amber-400">{validation}</p>}

          <label className="block text-[11px] text-neutral-500">
            {t('events.policyForm.name')}
            <input
              className="mt-1 h-8 w-full rounded-lg border border-black/[0.1] bg-transparent px-2 text-xs text-neutral-900 outline-none dark:border-white/[0.12] dark:text-white"
              onChange={(event) => update('name', event.target.value)}
              placeholder={t('events.policyForm.namePlaceholder')}
              value={form.name}
            />
          </label>

          <div className="block text-[11px] text-neutral-500">
            <label htmlFor="policy-event-types">{t('events.policyForm.eventTypes')}</label>
            <div className="relative">
              <input
                className="mt-1 h-8 w-full rounded-lg border border-black/[0.1] bg-transparent px-2 font-mono text-xs text-neutral-900 outline-none dark:border-white/[0.12] dark:text-white"
                id="policy-event-types"
                onChange={(event) => update('eventTypes', event.target.value)}
                onFocus={() => setIsTypeListOpen(true)}
                onBlur={() => window.setTimeout(() => setIsTypeListOpen(false), 120)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setIsTypeListOpen(false)
                }}
                value={form.eventTypes}
              />
              {typeSuggestions.length > 0 && (
                <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-black/[0.08] bg-white py-1 shadow-lg dark:border-white/[0.12] dark:bg-neutral-900">
                  {typeSuggestions.map((type) => (
                    <li key={type}>
                      <button
                        className="block w-full px-2 py-1.5 text-left font-mono text-[11px] text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-white/[0.06]"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectType(type)}
                        type="button"
                      >
                        {type}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <span className="mt-1 block text-[10px] text-neutral-400">
              {t('events.policyForm.eventTypesHint')}
            </span>
          </div>

          <label className="block text-[11px] text-neutral-500">
            {t('events.policyForm.minSeverity')}
            <select
              className="mt-1 h-8 w-full rounded-lg border border-black/[0.1] bg-transparent px-2 text-xs text-neutral-900 outline-none dark:border-white/[0.12] dark:text-white"
              onChange={(event) => update('minSeverity', event.target.value as EventSeverity)}
              value={form.minSeverity}
            >
              <option value="INFO">{t('events.severity.INFO')}</option>
              <option value="WARNING">{t('events.severity.WARNING')}</option>
              <option value="CRITICAL">{t('events.severity.CRITICAL')}</option>
            </select>
          </label>

          <label className="block text-[11px] text-neutral-500">
            {t('events.policyForm.recipients')}
            <input
              className="mt-1 h-8 w-full rounded-lg border border-black/[0.1] bg-transparent px-2 text-xs text-neutral-900 outline-none dark:border-white/[0.12] dark:text-white"
              onChange={(event) => update('recipients', event.target.value)}
              value={form.recipients}
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="block text-[11px] text-neutral-500">
              {t('events.policyForm.cooldown')}
              <input
                className="mt-1 h-8 w-full rounded-lg border border-black/[0.1] bg-transparent px-2 text-xs text-neutral-900 outline-none dark:border-white/[0.12] dark:text-white"
                min={0}
                onChange={(event) => update('cooldownSeconds', event.target.value)}
                type="number"
                value={form.cooldownSeconds}
              />
            </label>
            <label className="block text-[11px] text-neutral-500">
              {t('events.policyForm.timezone')}
              <input
                className="mt-1 h-8 w-full rounded-lg border border-black/[0.1] bg-transparent px-2 font-mono text-xs text-neutral-900 outline-none dark:border-white/[0.12] dark:text-white"
                onChange={(event) => update('timezone', event.target.value)}
                value={form.timezone}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="block text-[11px] text-neutral-500">
              {t('events.policyForm.quietStart')}
              <input
                className="mt-1 h-8 w-full rounded-lg border border-black/[0.1] bg-transparent px-2 font-mono text-xs text-neutral-900 outline-none dark:border-white/[0.12] dark:text-white"
                onChange={(event) => update('quietHoursStart', event.target.value)}
                placeholder="22:00"
                value={form.quietHoursStart}
              />
            </label>
            <label className="block text-[11px] text-neutral-500">
              {t('events.policyForm.quietEnd')}
              <input
                className="mt-1 h-8 w-full rounded-lg border border-black/[0.1] bg-transparent px-2 font-mono text-xs text-neutral-900 outline-none dark:border-white/[0.12] dark:text-white"
                onChange={(event) => update('quietHoursEnd', event.target.value)}
                placeholder="07:00"
                value={form.quietHoursEnd}
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-[11px] text-neutral-500">
            <input
              checked={form.enabled}
              onChange={(event) => update('enabled', event.target.checked)}
              type="checkbox"
            />
            {t('events.policyForm.enabled')}
          </label>

          <button
            className="h-8 w-full rounded-lg bg-neutral-900 text-xs text-white transition-colors hover:bg-neutral-700 disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            disabled={isSaving}
            onClick={() => void submit()}
            type="button"
          >
            {isSaving ? t('events.loading') : t('events.actions.save')}
          </button>
        </section>
      </div>
    </div>
  )
}
