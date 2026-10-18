import Badge from '@langgenius/dify-ui/badge'
import FilterEmptyState from '@langgenius/dify-ui/filter-empty-state'
import { SearchInput } from '@langgenius/dify-ui/search-input'
import { StatusDot } from '@langgenius/dify-ui/status-dot'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useCloudAppState } from '../../state/cloud-app-state'

export function OrganizationsPage() {
  const { t } = useTranslation()
  const { activeOrganization, organizations } = useCloudAppState()
  const [searchQuery, setSearchQuery] = useState('')
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
      <header className="border-divider-subtle flex shrink-0 items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="title-xl-semi-bold text-text-primary">
            {t('sections.organizations.title')}
          </h1>
          <p className="body-sm-regular text-text-tertiary mt-1">
            {t('sections.organizations.description')}
          </p>
        </div>
      </header>

      <div className="border-divider-subtle flex shrink-0 flex-wrap items-center justify-between gap-3 border-b px-6 py-2.5">
        <p className="system-xs-regular text-text-tertiary">
          {t('organizationList.current')}{' '}
          <span className="system-xs-medium text-text-secondary">
            {activeOrganization?.name ?? '—'}
          </span>
          <span> · {t('organizationList.count', { count: organizations.length })}</span>
        </p>
        <SearchInput
          className="w-50 max-w-full"
          value={searchQuery}
          onValueChange={setSearchQuery}
          aria-label={t('common.searchOrganizations')}
          clearLabel={t('organizationList.clearSearch')}
          placeholder={t('common.searchOrganizations')}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {organizations.length === 0 ? (
          <div className="relative min-h-130 flex-1 overflow-hidden">
            <div className="pointer-events-none absolute inset-x-8 inset-y-2 grid grid-cols-[repeat(auto-fill,minmax(296px,1fr))] grid-rows-4 gap-3">
              {Array.from({ length: 16 }, (_, index) => (
                <div key={index} className="bg-background-default-lighter rounded-xl opacity-75" />
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
                        status={organization.status === 'SUSPENDED' ? 'error' : 'success'}
                        size="small"
                      />
                      <span>
                        {t(
                          `organizationList.${organization.status === 'SUSPENDED' ? 'suspended' : 'active'}`,
                        )}
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{organization.ownerEmail ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
