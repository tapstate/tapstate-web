import { Building2, ShieldCheck, UserRound } from 'lucide-react'

import { useCloudAppState } from '../../state/cloud-app-state'

export function SettingsPage() {
  const { activeOrganization, user } = useCloudAppState()

  return (
    <div className="flex h-full flex-1 flex-col overflow-y-auto">
      <header className="flex shrink-0 items-center justify-between border-b border-black/[0.05] px-6 py-4 dark:border-white/[0.05]">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">
            Settings
          </h1>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            Account and organization details.
          </p>
        </div>
      </header>

      <div className="max-w-4xl space-y-6 p-6">
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-xs font-semibold tracking-wider text-neutral-400 uppercase">
            <UserRound className="h-3.5 w-3.5" />
            Account
          </h2>
          <div className="space-y-3 rounded-xl border border-black/[0.06] p-4 dark:border-white/[0.06]">
            <div>
              <div className="text-xs font-medium text-neutral-900 dark:text-white">Name</div>
              <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                {user?.displayName?.trim() || '—'}
              </div>
            </div>
            <div className="border-t border-black/[0.05] pt-3 dark:border-white/[0.05]">
              <div className="text-xs font-medium text-neutral-900 dark:text-white">
                Email Address
              </div>
              <div className="mt-1 font-mono text-xs text-neutral-500 dark:text-neutral-400">
                {user?.email ?? '—'}
              </div>
            </div>
            <div className="border-t border-black/[0.05] pt-3 dark:border-white/[0.05]">
              <div className="text-xs font-medium text-neutral-900 dark:text-white">Account ID</div>
              <div className="mt-1 font-mono text-[11px] break-all text-neutral-500 dark:text-neutral-400">
                {user?.id ?? '—'}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-xs font-semibold tracking-wider text-neutral-400 uppercase">
            <Building2 className="h-3.5 w-3.5" />
            Organization
          </h2>
          <div className="space-y-3 rounded-xl border border-black/[0.06] p-4 dark:border-white/[0.06]">
            <div>
              <div className="text-xs font-medium text-neutral-900 dark:text-white">Name</div>
              <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                {activeOrganization?.name ?? '—'}
              </div>
            </div>
            <div className="border-t border-black/[0.05] pt-3 dark:border-white/[0.05]">
              <div className="text-xs font-medium text-neutral-900 dark:text-white">Slug</div>
              <div className="mt-1 font-mono text-xs text-neutral-500 dark:text-neutral-400">
                {activeOrganization?.slug ?? '—'}
              </div>
            </div>
            <div className="flex items-start gap-2 border-t border-black/[0.05] pt-3 text-xs text-neutral-500 dark:border-white/[0.05] dark:text-neutral-400">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>Changes to these settings are not available yet.</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
