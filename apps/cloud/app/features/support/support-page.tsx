import type { TFunction } from 'i18next'

import { ArrowLeft, ArrowRight, LifeBuoy, RefreshCw, Send, TicketCheck } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import {
  CloudApiError,
  cloudApi,
  type CloudTicket,
  type CloudTicketPage,
} from '../../service/cloud-api'

const pageSize = 20

function errorMessage(error: unknown, t: TFunction) {
  if (!(error instanceof CloudApiError)) return t('support.errors.generic')

  const codeKeys: Record<string, string> = {
    'ticket.not-configured': 'support.errors.notConfigured',
    'ticket.customer-not-ready': 'support.errors.customerNotReady',
    'ticket.email-not-verified': 'support.errors.emailNotVerified',
    'ticket.integration-failed': 'support.errors.integrationFailed',
    'ticket.request-rejected': 'support.errors.requestRejected',
    'ticket.close-unavailable': 'support.errors.closeUnavailable',
    'ticket.not-found': 'support.errors.notFound',
    'ticket.submission-uncertain': 'support.errors.submissionUncertain',
  }
  const key = error.code ? codeKeys[error.code] : undefined
  const message = key ?? (error.status === 0 ? 'support.errors.network' : 'support.errors.generic')
  const opId = error.opId ? t('support.operationId', { id: error.opId }) : ''
  return t(message, { opId })
}

function formatDate(value: string, locale: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function StatusBadge({ status, category }: { status: string; category: string }) {
  const normalized = category.toLowerCase()
  const tone =
    normalized === 'done' || normalized === 'complete'
      ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
      : normalized === 'indeterminate'
        ? 'border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300'
        : 'border-[var(--border)] bg-[var(--app-background)] text-[var(--foreground)]'

  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-medium ${tone}`}
    >
      {status}
    </span>
  )
}

function ticketDescription(ticket: CloudTicket) {
  return ticket.description.trim()
}

export function SupportPage() {
  const { t, i18n } = useTranslation()
  const [page, setPage] = useState<CloudTicketPage | null>(null)
  const [pageIndex, setPageIndex] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedIdRef = useRef<string | null>(null)
  const detailRequestId = useRef(0)
  const [selected, setSelected] = useState<CloudTicket | null>(null)
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [summary, setSummary] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitUncertain, setSubmitUncertain] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [confirmingClose, setConfirmingClose] = useState(false)
  const [closing, setClosing] = useState(false)
  const [closeError, setCloseError] = useState<string | null>(null)

  const clearSelection = useCallback(() => {
    detailRequestId.current += 1
    selectedIdRef.current = null
    setSelectedId(null)
    setSelected(null)
    setDetailLoading(false)
    setDetailError(null)
    setConfirmingClose(false)
    setCloseError(null)
  }, [])

  const loadTickets = useCallback(
    async (targetPage = pageIndex) => {
      setListLoading(true)
      setListError(null)
      try {
        const result = await cloudApi.tickets(targetPage, pageSize)
        setPage(result)
        if (
          selectedIdRef.current &&
          !result.items.some((ticket) => ticket.id === selectedIdRef.current)
        ) {
          clearSelection()
        }
      } catch (error) {
        setListError(errorMessage(error, t))
      } finally {
        setListLoading(false)
      }
    },
    [clearSelection, pageIndex, t],
  )

  useEffect(() => {
    void loadTickets(pageIndex)
  }, [loadTickets, pageIndex])

  const selectTicket = async (ticketId: string) => {
    const requestId = ++detailRequestId.current
    selectedIdRef.current = ticketId
    setSelectedId(ticketId)
    setSelected(null)
    setDetailLoading(true)
    setDetailError(null)
    setCloseError(null)
    setConfirmingClose(false)
    try {
      const ticket = await cloudApi.ticket(ticketId)
      if (detailRequestId.current === requestId) setSelected(ticket)
    } catch (error) {
      if (detailRequestId.current === requestId) setDetailError(errorMessage(error, t))
    } finally {
      if (detailRequestId.current === requestId) setDetailLoading(false)
    }
  }

  const refreshTickets = async () => {
    await loadTickets(pageIndex)
    const currentSelection = selectedIdRef.current
    if (currentSelection) await selectTicket(currentSelection)
  }

  const submitTicket = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setSubmitError(null)
    setSubmitUncertain(false)
    setSubmitSuccess(false)
    try {
      const created = await cloudApi.createTicket({
        summary: summary.trim(),
        description: description.trim(),
      })
      if (!created || typeof created.id !== 'string' || !created.id.trim()) {
        throw new CloudApiError(
          'Cloud API returned an incomplete ticket response.',
          200,
          'ticket.submission-uncertain',
        )
      }
      setSummary('')
      setDescription('')
      setSubmitSuccess(true)
      setPageIndex(0)
      await loadTickets(0)
      await selectTicket(created.id)
    } catch (error) {
      const uncertain =
        error instanceof CloudApiError &&
        (error.code === 'ticket.submission-uncertain' ||
          error.status === 0 ||
          error.status >= 500 ||
          (error.status >= 200 && error.status < 300))
      setSubmitUncertain(uncertain)
      setSubmitError(errorMessage(error, t))
    } finally {
      setSubmitting(false)
    }
  }

  const closeTicket = async () => {
    if (!selected || !selected.canClose || closing) return
    const closingId = selected.id
    setClosing(true)
    setCloseError(null)
    try {
      const updated = await cloudApi.closeTicket(closingId)
      if (selectedIdRef.current === closingId) {
        setSelected(updated)
        setConfirmingClose(false)
      }
      await loadTickets(pageIndex)
    } catch (error) {
      if (selectedIdRef.current === closingId) setCloseError(errorMessage(error, t))
    } finally {
      setClosing(false)
    }
  }

  const changePage = (nextPage: number) => {
    clearSelection()
    setPageIndex(nextPage)
  }

  const renderError = (message: string, retry: () => void) => (
    <div
      className="space-y-3 rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-700 dark:text-red-300"
      role="alert"
    >
      <p>{message}</p>
      <button
        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border)] px-3 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--app-background)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current active:scale-[0.96]"
        onClick={retry}
        type="button"
      >
        <RefreshCw aria-hidden="true" className="h-4 w-4" />
        {t('support.retry')}
      </button>
    </div>
  )

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto bg-[var(--app-background)]">
      <header className="flex shrink-0 items-start gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface)] px-5 py-5 sm:px-8">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--app-background)] text-[var(--foreground)]">
          <LifeBuoy aria-hidden="true" className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-[var(--foreground)] sm:text-xl">
            {t('support.title')}
          </h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-[var(--muted-foreground)]">
            {t('support.scope')}
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            {t('support.responseTarget')}
          </p>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1440px] min-w-0 flex-1 content-start gap-5 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]">
        <section className="contents" aria-labelledby="support-create-heading">
          <div className="order-2 min-w-0 space-y-3 xl:col-start-2 xl:row-start-1">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2
                  id="support-create-heading"
                  className="text-sm font-semibold text-[var(--foreground)]"
                >
                  {t('support.createTitle')}
                </h2>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {t('support.createDescription')}
                </p>
              </div>
            </div>
            <form
              className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5"
              onSubmit={submitTicket}
            >
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-[var(--foreground)]">
                  {t('support.summaryLabel')}
                </span>
                <input
                  autoComplete="off"
                  className="min-h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--app-background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                  maxLength={255}
                  onChange={(event) => setSummary(event.target.value)}
                  placeholder={t('support.summaryPlaceholder')}
                  required
                  value={summary}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-[var(--foreground)]">
                  {t('support.descriptionLabel')}
                </span>
                <textarea
                  className="min-h-32 w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--app-background)] px-3 py-2.5 text-sm leading-relaxed text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                  maxLength={10000}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder={t('support.descriptionPlaceholder')}
                  required
                  value={description}
                />
              </label>
              {submitSuccess && (
                <p className="text-sm text-emerald-700 dark:text-emerald-300" role="status">
                  {t('support.submitSuccess')}
                </p>
              )}
              {submitError && (
                <div className="text-destructive space-y-2 text-sm" role="alert">
                  <p>{submitError}</p>
                  {submitUncertain && (
                    <p className="font-medium">{t('support.uncertainGuidance')}</p>
                  )}
                </div>
              )}
              <div className="flex justify-end">
                <button
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                  disabled={submitting || !summary.trim() || !description.trim()}
                  type="submit"
                >
                  <Send aria-hidden="true" className="h-4 w-4" />
                  {submitting ? t('support.submitting') : t('support.submit')}
                </button>
              </div>
            </form>
          </div>

          <section className="order-1 min-w-0" aria-labelledby="support-list-heading">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2
                  id="support-list-heading"
                  className="text-sm font-semibold text-[var(--foreground)]"
                >
                  {t('support.myTickets')}
                </h2>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {t('support.listDescription')}
                </p>
              </div>
              <button
                aria-label={t('support.refresh')}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] transition-colors hover:bg-[var(--app-background)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current active:scale-[0.96] disabled:opacity-60"
                disabled={listLoading}
                onClick={() => void refreshTickets()}
                type="button"
              >
                <RefreshCw
                  aria-hidden="true"
                  className={`h-4 w-4 ${listLoading ? 'animate-spin' : ''}`}
                />
              </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              {listLoading ? (
                <div aria-live="polite" className="space-y-3 p-4">
                  <p className="text-sm text-[var(--muted-foreground)]">{t('support.loading')}</p>
                  <div className="h-10 animate-pulse rounded-md bg-[var(--app-background)]" />
                  <div className="h-10 animate-pulse rounded-md bg-[var(--app-background)]" />
                </div>
              ) : listError ? (
                <div className="p-4">{renderError(listError, () => void refreshTickets())}</div>
              ) : page?.items.length ? (
                <>
                  <ul className="divide-y divide-[var(--border-subtle)]">
                    {page.items.map((ticket) => (
                      <li key={ticket.id}>
                        <button
                          aria-current={selectedId === ticket.id ? 'true' : undefined}
                          className={`focus-visible:outline-inset flex w-full min-w-0 items-start justify-between gap-3 p-4 text-left transition-colors hover:bg-[var(--app-background)] focus-visible:outline-2 focus-visible:outline-current active:scale-[0.96] ${selectedId === ticket.id ? 'bg-[var(--app-background)]' : ''}`}
                          onClick={() => void selectTicket(ticket.id)}
                          type="button"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium break-words text-[var(--foreground)]">
                              {ticket.summary}
                            </span>
                            <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--muted-foreground)]">
                              <span className="font-medium tabular-nums">{ticket.jiraKey}</span>
                              <span aria-hidden="true">·</span>
                              <span>{formatDate(ticket.createdAt, i18n.language)}</span>
                            </span>
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            <StatusBadge category={ticket.statusCategory} status={ticket.status} />
                            <ArrowRight
                              aria-hidden="true"
                              className="hidden h-4 w-4 text-[var(--muted-foreground)] sm:block"
                            />
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-col items-start justify-between gap-3 border-t border-[var(--border-subtle)] px-4 py-3 sm:flex-row sm:items-center">
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {t('support.pageCount', {
                        current: page.page + 1,
                        total: Math.max(page.totalPages, 1),
                        count: page.totalItems,
                      })}
                    </span>
                    <div className="flex w-full justify-end gap-2 sm:w-auto">
                      <button
                        className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-[var(--border)] px-3 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--app-background)] active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={page.page <= 0 || listLoading}
                        onClick={() => changePage(Math.max(0, page.page - 1))}
                        type="button"
                      >
                        <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
                        {t('support.previous')}
                      </button>
                      <button
                        className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-[var(--border)] px-3 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--app-background)] active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!page.hasNext || listLoading}
                        onClick={() => changePage(page.page + 1)}
                        type="button"
                      >
                        {t('support.next')}
                        <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex min-h-40 flex-col items-center justify-center px-5 py-8 text-center">
                  <TicketCheck
                    aria-hidden="true"
                    className="mb-3 h-6 w-6 text-[var(--muted-foreground)]"
                  />
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {t('support.emptyTitle')}
                  </p>
                  <p className="mt-1 max-w-sm text-xs leading-relaxed text-[var(--muted-foreground)]">
                    {t('support.emptyDescription')}
                  </p>
                </div>
              )}
            </div>
          </section>
        </section>

        <aside
          className={`order-3 min-w-0 xl:col-start-1 ${selectedId || detailLoading || detailError ? 'block' : 'hidden'}`}
          aria-labelledby="support-detail-heading"
        >
          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            <div className="border-b border-[var(--border-subtle)] px-4 py-3 sm:px-5">
              <h2
                id="support-detail-heading"
                className="text-sm font-semibold text-[var(--foreground)]"
              >
                {t('support.details')}
              </h2>
            </div>
            {detailLoading ? (
              <p aria-live="polite" className="p-5 text-sm text-[var(--muted-foreground)]">
                {t('support.loadingDetails')}
              </p>
            ) : detailError ? (
              <div className="p-4">
                {renderError(detailError, () => selectedId && void selectTicket(selectedId))}
              </div>
            ) : selected ? (
              <div className="space-y-4 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[var(--muted-foreground)] tabular-nums">
                      {selected.jiraKey}
                    </p>
                    <h3 className="mt-1 text-base font-semibold break-words text-[var(--foreground)]">
                      {selected.summary}
                    </h3>
                  </div>
                  <StatusBadge category={selected.statusCategory} status={selected.status} />
                </div>
                <div className="space-y-1 border-t border-[var(--border-subtle)] pt-3">
                  <p className="text-xs font-medium text-[var(--muted-foreground)]">
                    {t('support.submittedAt')}
                  </p>
                  <p className="text-sm text-[var(--foreground)]">
                    {formatDate(selected.createdAt, i18n.language)}
                  </p>
                </div>
                <div className="space-y-1 border-t border-[var(--border-subtle)] pt-3">
                  <p className="text-xs font-medium text-[var(--muted-foreground)]">
                    {t('support.descriptionLabel')}
                  </p>
                  <p className="max-h-72 overflow-y-auto text-sm leading-relaxed break-words whitespace-pre-wrap text-[var(--foreground)]">
                    {ticketDescription(selected)}
                  </p>
                </div>
                {closeError && (
                  <p className="text-destructive text-sm" role="alert">
                    {closeError}
                  </p>
                )}
                {selected.canClose &&
                  (confirmingClose ? (
                    <div
                      className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--app-background)] p-3"
                      role="group"
                      aria-label={t('support.closeConfirmation')}
                    >
                      <p className="text-sm text-[var(--foreground)]">
                        {t('support.closeConfirmation')}
                      </p>
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          className="min-h-10 rounded-lg border border-[var(--border)] px-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface)] active:scale-[0.96] disabled:opacity-60"
                          disabled={closing}
                          onClick={() => setConfirmingClose(false)}
                          type="button"
                        >
                          {t('support.cancel')}
                        </button>
                        <button
                          className="min-h-10 rounded-lg bg-neutral-900 px-3 text-sm font-medium text-white hover:bg-neutral-800 active:scale-[0.96] disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                          disabled={closing}
                          onClick={() => void closeTicket()}
                          type="button"
                        >
                          {closing ? t('support.closing') : t('support.confirmClose')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="min-h-10 rounded-lg border border-[var(--border)] px-3 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--app-background)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current active:scale-[0.96]"
                      disabled={closing}
                      onClick={() => setConfirmingClose(true)}
                      type="button"
                    >
                      {t('support.closeTicket')}
                    </button>
                  ))}
                {!selected.canClose && (
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {t('support.closeUnavailable')}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex min-h-48 flex-col items-center justify-center px-5 py-8 text-center">
                <TicketCheck
                  aria-hidden="true"
                  className="mb-3 h-6 w-6 text-[var(--muted-foreground)]"
                />
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {t('support.selectTicket')}
                </p>
                <p className="mt-1 max-w-sm text-xs leading-relaxed text-[var(--muted-foreground)]">
                  {t('support.selectTicketDescription')}
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
