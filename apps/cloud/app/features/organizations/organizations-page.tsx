import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { useCloudAppState } from '../../state/cloud-app-state'

export function OrganizationsPage() {
  const { activeOrganization, organizations } = useCloudAppState()
  const [searchQuery, setSearchQuery] = useState('')
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
