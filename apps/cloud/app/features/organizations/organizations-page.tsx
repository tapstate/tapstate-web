import Badge from '@tapstate-web/ui/badge'
import { Button } from '@tapstate-web/ui/button'
import FilterEmptyState from '@tapstate-web/ui/filter-empty-state'
import { Input } from '@tapstate-web/ui/input'
import { SearchInput } from '@tapstate-web/ui/search-input'
import { StatusDot } from '@tapstate-web/ui/status-dot'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CloudApiError, cloudApi, type OrganizationInvitation } from '../../service/cloud-api'
import { useCloudAppState } from '../../state/cloud-app-state'

export function OrganizationsPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { t } = useTranslation()
  const { activeOrganization, organizations, user } = useCloudAppState()
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
          .includes(searchQuery.trim().toLowerCase()),
      ),
    [organizations, searchQuery],
  )

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      {!embedded && (
        <header className="border-divider-subtle flex shrink-0 items-center justify-between border-b px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">
              {t('sections.organizations.title')}
            </h1>
            <p className="body-sm-regular text-text-tertiary mt-1">
              {t('sections.organizations.description')}
            </p>
          </div>
        </header>
      )}

      {canManageInvitations && activeOrganization && (
        <section
          aria-labelledby="organization-invitations-title"
          className="border-divider-subtle shrink-0 space-y-4 border-b p-6"
        >
          <div>
            <h2
              className="title-md-semi-bold text-text-primary"
              id="organization-invitations-title"
            >
              {t('organizations.invitationsTitle')}
            </h2>
            <p className="body-xs-regular text-text-tertiary mt-1">
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
            <Input
              autoComplete="email"
              className="min-w-0 flex-1"
              onValueChange={setInviteEmail}
              placeholder={t('organizations.inviteEmailPlaceholder')}
              type="email"
              value={inviteEmail}
            />
            <Button disabled={isCreatingInvitation} size="medium" type="submit" variant="primary">
              {t(
                isCreatingInvitation
                  ? 'organizations.creatingInvite'
                  : 'organizations.createInvite',
              )}
            </Button>
          </form>

          {inviteLink && (
            <div className="border-divider-subtle bg-components-card-bg space-y-2 rounded-lg border p-3">
              <p className="body-xs-regular text-text-tertiary">
                {t('organizations.inviteCreatedNotice')}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  aria-label={t('organizations.inviteLink')}
                  className="min-w-0 flex-1 font-mono"
                  readOnly
                  value={inviteLink}
                />
                <Button
                  onClick={() => void copyInviteLink()}
                  size="medium"
                  type="button"
                  variant="secondary"
                >
                  {t(copiedInvite ? 'organizations.copied' : 'organizations.copyInvite')}
                </Button>
              </div>
            </div>
          )}

          {invitationError && (
            <p className="body-xs-regular text-text-destructive" role="alert">
              {t(invitationError)}
            </p>
          )}

          <div className="border-divider-subtle overflow-x-auto rounded-lg border">
            <table className="w-full min-w-140 border-collapse text-sm">
              <thead className="border-divider-subtle text-text-tertiary border-b text-xs font-medium uppercase">
                <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-[weight:inherit]">
                  <th>{t('organizations.invitedEmail')}</th>
                  <th>{t('organizations.inviteExpires')}</th>
                  <th>{t('organizations.inviteStatus')}</th>
                  <th>{t('organizations.inviteActions')}</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((invitation) => (
                  <tr
                    className="border-divider-subtle text-text-secondary border-b last:border-0"
                    key={invitation.id}
                  >
                    <td className="text-text-primary px-3 py-2.5">
                      {invitation.invitedEmail ?? t('organizations.anyEmail')}
                    </td>
                    <td className="px-3 py-2.5">
                      {new Date(invitation.expiresAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2.5">
                      {t(`organizations.status.${invitation.status}`)}
                    </td>
                    <td className="px-3 py-2.5">
                      {invitation.status === 'active' && (
                        <Button
                          className="px-0"
                          disabled={busyInvitationId === invitation.id}
                          onClick={() => void revokeInvitation(invitation.id)}
                          size="small"
                          type="button"
                          variant="ghost"
                        >
                          {t(
                            busyInvitationId === invitation.id
                              ? 'organizations.revokingInvite'
                              : 'organizations.revokeInvite',
                          )}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {invitations.length === 0 && (
                  <tr>
                    <td className="text-text-tertiary px-3 py-4" colSpan={4}>
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
        </section>
      )}

      <div className="border-divider-subtle bg-background-default-subtle flex shrink-0 flex-wrap items-center justify-between gap-3 border-b px-6 py-2.5">
        <p className="system-xs-regular text-text-tertiary">
          {t('organizationList.current')}{' '}
          <span className="system-xs-medium text-text-secondary">
            {activeOrganization?.name ?? '—'}
          </span>
          {organizations.length > 1 && (
            <span> · {t('organizationList.count', { count: organizations.length })}</span>
          )}
        </p>
        {organizations.length > 1 && (
          <SearchInput
            aria-label={t('common.searchOrganizations')}
            className="w-50 max-w-full"
            clearLabel={t('organizationList.clearSearch')}
            onValueChange={setSearchQuery}
            placeholder={t('common.searchOrganizations')}
            value={searchQuery}
          />
        )}
      </div>

      {organizations.length !== 1 && (
        <div className="min-h-0 flex-1 overflow-auto">
          {organizations.length === 0 ? (
            <div className="relative min-h-130 flex-1 overflow-hidden">
              <div className="pointer-events-none absolute inset-x-8 inset-y-2 grid grid-cols-[repeat(auto-fill,minmax(296px,1fr))] grid-rows-4 gap-3">
                {Array.from({ length: 16 }, (_, index) => (
                  <div
                    key={index}
                    className="bg-background-default-lighter rounded-xl opacity-75"
                  />
                ))}
              </div>
              <div className="from-background-body/0 to-background-body pointer-events-none absolute inset-0 bg-linear-to-b" />
              <section className="absolute inset-0 flex items-center justify-center overflow-hidden p-2">
                <div className="flex flex-col items-center gap-3">
                  <div className="border-divider-regular bg-components-card-bg flex size-14 items-center justify-center overflow-hidden rounded-xl border border-dashed p-1 backdrop-blur-md">
                    <span aria-hidden className="i-ri-building-line text-text-tertiary size-6" />
                  </div>
                  <h2 className="system-sm-regular text-text-tertiary text-center">
                    {t('organizationList.noOrganizations')}
                  </h2>
                </div>
              </section>
            </div>
          ) : filteredOrganizations.length === 0 ? (
            <div className="relative min-h-60">
              <FilterEmptyState title={t('organizationList.noMatches')} />
            </div>
          ) : (
            <table className="w-full min-w-175 border-collapse border-0 text-sm">
              <thead className="border-divider-subtle text-text-tertiary h-8 border-b text-xs/8 font-medium uppercase">
                <tr className="[&>th]:px-3 [&>th]:text-left [&>th]:font-[weight:inherit]">
                  <th>{t('organizationList.name')}</th>
                  <th>{t('organizationList.slug')}</th>
                  <th>{t('organizationList.status')}</th>
                  <th>{t('organizationList.owner')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrganizations.map((organization) => (
                  <tr
                    className="border-divider-subtle text-text-secondary hover:bg-state-base-hover border-b"
                    key={organization.id}
                  >
                    <td className="text-text-primary px-3 py-2 font-medium">
                      {organization.name}
                      {organization.id === activeOrganization?.id && (
                        <Badge className="ml-2">{t('organizationList.currentBadge')}</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{organization.slug}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1.5">
                        <StatusDot
                          className="rounded-full"
                          size="small"
                          status={organization.status === 'SUSPENDED' ? 'error' : 'success'}
                        />
                        <span>
                          {t(
                            `organizationList.${organization.status === 'SUSPENDED' ? 'suspended' : 'active'}`,
                          )}
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {organization.ownerEmail ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
