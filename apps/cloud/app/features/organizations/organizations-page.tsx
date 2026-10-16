import { Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CloudApiError, cloudApi, type OrganizationInvitation } from '../../service/cloud-api'
import { useCloudAppState } from '../../state/cloud-app-state'

export function OrganizationsPage() {
  const { activeOrganization, organizations, user } = useCloudAppState()
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([])
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false)
  const [isCreatingInvitation, setIsCreatingInvitation] = useState(false)
  const [busyInvitationId, setBusyInvitationId] = useState<string | null>(null)
  const [invitationError, setInvitationError] = useState<string | null>(null)
  const [copiedInvite, setCopiedInvite] = useState(false)
  const canManageInvitations = Boolean(
    activeOrganization?.ownerEmail &&
    user?.email.toLowerCase() === activeOrganization.ownerEmail.toLowerCase(),
  )

  useEffect(() => {
    if (!activeOrganization || !canManageInvitations) {
      setInvitations([])
      return
    }
    let cancelled = false
    setIsLoadingInvitations(true)
    cloudApi
      .invitations(activeOrganization.id)
      .then((items) => {
        if (!cancelled) setInvitations(items)
      })
      .catch(() => {
        if (!cancelled) setInvitationError('organizations.inviteLoadError')
      })
      .finally(() => {
        if (!cancelled) setIsLoadingInvitations(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeOrganization, canManageInvitations])

  const createInvitation = async () => {
    if (!activeOrganization) return
    setInvitationError(null)
    setCopiedInvite(false)
    setIsCreatingInvitation(true)
    try {
      const created = await cloudApi.createInvitation(
        activeOrganization.id,
        inviteEmail || undefined,
      )
      const url = new URL('/auth', window.location.origin)
      url.searchParams.set('invite', created.token)
      setInviteLink(url.toString())
      setInviteEmail('')
      setInvitations(await cloudApi.invitations(activeOrganization.id))
    } catch (error) {
      setInvitationError(
        error instanceof CloudApiError && error.status === 403
          ? 'organizations.ownerOnly'
          : 'organizations.inviteCreateError',
      )
    } finally {
      setIsCreatingInvitation(false)
    }
  }

  const revokeInvitation = async (invitationId: string) => {
    if (!activeOrganization) return
    setInvitationError(null)
    setBusyInvitationId(invitationId)
    try {
      const updated = await cloudApi.revokeInvitation(activeOrganization.id, invitationId)
      setInvitations((current) =>
        current.map((invitation) => (invitation.id === invitationId ? updated : invitation)),
      )
    } catch {
      setInvitationError('organizations.inviteRevokeError')
    } finally {
      setBusyInvitationId(null)
    }
  }

  const copyInviteLink = async () => {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopiedInvite(true)
    } catch {
      setInvitationError('organizations.copyError')
    }
  }
  const filteredOrganizations = useMemo(
    () =>
      organizations.filter((organization) =>
        `${organization.name} ${organization.slug}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase()),
      ),
    [organizations, searchQuery],
  )

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between border-b border-black/[0.05] px-6 py-4 dark:border-white/[0.05]">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">
            Organizations
          </h1>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            Manage the organizations associated with your account.
          </p>
        </div>
      </header>

      {canManageInvitations && activeOrganization && (
        <section
          aria-labelledby="organization-invitations-title"
          className="border-b border-[var(--border-subtle)] p-6"
        >
          <div className="mx-auto w-full max-w-5xl space-y-4">
            <div>
              <h2
                className="text-sm font-semibold text-[var(--foreground)]"
                id="organization-invitations-title"
              >
                {t('organizations.invitationsTitle')}
              </h2>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                {t('organizations.invitationsDescription')}
              </p>
            </div>

            <form
              className="flex flex-col gap-2 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault()
                void createInvitation()
              }}
            >
              <input
                autoComplete="email"
                className="h-10 min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder={t('organizations.inviteEmailPlaceholder')}
                type="email"
                value={inviteEmail}
              />
              <button
                className="h-10 rounded-md bg-[var(--foreground)] px-4 text-sm font-medium text-[var(--surface)] hover:opacity-90 disabled:opacity-60"
                disabled={isCreatingInvitation}
                type="submit"
              >
                {isCreatingInvitation
                  ? t('organizations.creatingInvite')
                  : t('organizations.createInvite')}
              </button>
            </form>

            {inviteLink && (
              <div className="space-y-2 rounded-md border border-[var(--border)] bg-[var(--app-background)] p-3">
                <p className="text-xs text-[var(--muted-foreground)]">
                  {t('organizations.inviteCreatedNotice')}
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    aria-label={t('organizations.inviteLink')}
                    className={`${'h-9 min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-xs text-[var(--foreground)]'} font-mono`}
                    readOnly
                    value={inviteLink}
                  />
                  <button
                    className="h-9 rounded-md border border-[var(--border)] px-3 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface)]"
                    onClick={() => void copyInviteLink()}
                    type="button"
                  >
                    {t(copiedInvite ? 'organizations.copied' : 'organizations.copyInvite')}
                  </button>
                </div>
              </div>
            )}

            {invitationError && (
              <p className="text-sm text-[var(--foreground)]" role="alert">
                {t(invitationError)}
              </p>
            )}

            <div className="overflow-x-auto rounded-md border border-[var(--border)]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--app-background)] text-[var(--muted-foreground)]">
                  <tr>
                    <th className="px-3 py-2 font-medium">{t('organizations.invitedEmail')}</th>
                    <th className="px-3 py-2 font-medium">{t('organizations.inviteExpires')}</th>
                    <th className="px-3 py-2 font-medium">{t('organizations.inviteStatus')}</th>
                    <th className="px-3 py-2 font-medium">{t('organizations.inviteActions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {invitations.map((invitation) => (
                    <tr key={invitation.id}>
                      <td className="px-3 py-2.5 text-[var(--foreground)]">
                        {invitation.invitedEmail ?? t('organizations.anyEmail')}
                      </td>
                      <td className="px-3 py-2.5 text-[var(--muted-foreground)]">
                        {new Date(invitation.expiresAt).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2.5 text-[var(--muted-foreground)]">
                        {t(`organizations.status.${invitation.status}`)}
                      </td>
                      <td className="px-3 py-2.5">
                        {invitation.status === 'active' && (
                          <button
                            className="text-xs font-medium text-[var(--foreground)] underline underline-offset-2 disabled:opacity-60"
                            disabled={busyInvitationId === invitation.id}
                            onClick={() => void revokeInvitation(invitation.id)}
                            type="button"
                          >
                            {t(
                              busyInvitationId === invitation.id
                                ? 'organizations.revokingInvite'
                                : 'organizations.revokeInvite',
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {invitations.length === 0 && (
                    <tr>
                      <td className="px-3 py-4 text-[var(--muted-foreground)]" colSpan={4}>
                        {t(
                          isLoadingInvitations
                            ? 'organizations.loadingInvites'
                            : 'organizations.noInvites',
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <div className="flex shrink-0 items-center justify-between border-b border-black/[0.05] bg-neutral-50/50 px-6 py-2.5 dark:border-white/[0.05] dark:bg-black/10">
        <div className="text-xs text-neutral-500">
          Current organization:{' '}
          <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200">
            {activeOrganization?.name ?? '—'}
          </span>
          <span> · {organizations.length} organizations</span>
        </div>

        <label className="relative">
          <Search className="absolute top-2 left-2.5 h-3.5 w-3.5 text-neutral-400" />
          <input
            className="w-48 rounded-lg border border-black/[0.08] bg-white py-1 pr-3 pl-8 text-xs text-neutral-800 focus:outline-none dark:border-white/[0.08] dark:bg-[#202124] dark:text-neutral-200"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search organizations..."
            type="search"
            value={searchQuery}
          />
        </label>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-black/[0.05] font-medium text-neutral-400 dark:border-white/[0.05] dark:text-neutral-500">
              <th className="px-6 py-3">Organization</th>
              <th className="px-6 py-3">Slug</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Owner</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
            {filteredOrganizations.map((organization) => (
              <tr
                className="transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                key={organization.id}
              >
                <td className="px-6 py-3.5 font-medium text-neutral-900 dark:text-white">
                  {organization.name}
                  {organization.id === activeOrganization?.id && (
                    <span className="ml-2 rounded bg-black/[0.04] px-1.5 py-0.5 text-[10px] text-neutral-500 dark:bg-white/[0.06]">
                      Current
                    </span>
                  )}
                </td>
                <td className="px-6 py-3.5 font-mono text-[11px] text-neutral-600 dark:text-neutral-300">
                  {organization.slug}
                </td>
                <td className="px-6 py-3.5">
                  <span className="flex items-center gap-1.5">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${organization.status === 'SUSPENDED' ? 'bg-red-500' : 'bg-emerald-500'}`}
                    />
                    <span className="text-neutral-700 capitalize dark:text-neutral-300">
                      {(organization.status ?? 'ACTIVE').toLowerCase()}
                    </span>
                  </span>
                </td>
                <td className="px-6 py-3.5 font-mono text-[11px] text-neutral-500">
                  {organization.ownerEmail ?? '—'}
                </td>
              </tr>
            ))}
            {filteredOrganizations.length === 0 && (
              <tr>
                <td className="px-6 py-12 text-center text-xs text-neutral-400" colSpan={4}>
                  {organizations.length === 0
                    ? 'No organizations are available for this account.'
                    : 'No organizations match your search.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
