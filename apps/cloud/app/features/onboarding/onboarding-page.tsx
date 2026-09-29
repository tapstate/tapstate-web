import { AlertCircle, ArrowRight, Check, MapPin, Moon, RefreshCw, Sun } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import type { UserProfile } from '../../types'

import { cloudApi, type Cluster, type Organization, type Region } from '../../service/cloud-api'

export interface OnboardingInput {
  organizationName: string
  organizationSlug: string
  region: Region
  clusterName: string
}

interface OnboardingPageProps {
  darkMode: boolean
  setDarkMode: (enabled: boolean) => void
  user: UserProfile
  onComplete: (organization: Organization, cluster: Cluster) => void
  onCreateWorkspace: (
    input: OnboardingInput,
  ) => Promise<{ organization: Organization; cluster: Cluster }>
}

function toSlug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

export function OnboardingPage({
  darkMode,
  setDarkMode,
  user,
  onComplete,
  onCreateWorkspace,
}: OnboardingPageProps) {
  const { t } = useTranslation()
  const [regions, setRegions] = useState<Region[]>([])
  const [selectedRegionCode, setSelectedRegionCode] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [isLoadingRegions, setIsLoadingRegions] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasLoadError, setHasLoadError] = useState(false)
  const [hasSubmitError, setHasSubmitError] = useState(false)

  const selectedRegion = useMemo(
    () => regions.find((region) => region.code === selectedRegionCode) ?? null,
    [regions, selectedRegionCode],
  )
  const organizationSlug = toSlug(organizationName)
  const clusterName = organizationSlug ? `${organizationSlug}-stream`.slice(0, 100) : ''

  const loadRegions = async () => {
    setIsLoadingRegions(true)
    setHasLoadError(false)
    try {
      const availableRegions = (await cloudApi.regions()).filter((region) => region.open)
      setRegions(availableRegions)
      setSelectedRegionCode((current) =>
        availableRegions.some((region) => region.code === current)
          ? current
          : (availableRegions[0]?.code ?? ''),
      )
    } catch {
      setHasLoadError(true)
    } finally {
      setIsLoadingRegions(false)
    }
  }

  useEffect(() => {
    void loadRegions()
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setHasSubmitError(false)
    if (!selectedRegion || !organizationSlug) return

    setIsSubmitting(true)
    try {
      const result = await onCreateWorkspace({
        organizationName: organizationName.trim(),
        organizationSlug,
        region: selectedRegion,
        clusterName,
      })
      onComplete(result.organization, result.cluster)
    } catch {
      setHasSubmitError(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  const accountName = user.displayName?.trim() || user.email

  return (
    <div
      className={`flex min-h-screen w-full flex-col justify-between font-sans transition-colors duration-200 ${darkMode ? 'dark bg-[#111215] text-[#f0f1f3]' : 'bg-[#fafafa] text-[#111827]'}`}
    >
      <header className="flex h-16 w-full items-center justify-between border-b border-black/[0.05] bg-transparent px-6 sm:px-12 dark:border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-neutral-900 text-xs font-bold text-white shadow-2xs dark:bg-white dark:text-neutral-900">
            <span className="font-mono text-[11px] leading-none">T</span>
          </div>
          <span className="text-sm font-semibold tracking-tight text-[#111827] dark:text-white">
            Tapstate
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden max-w-56 truncate text-xs text-neutral-500 sm:block dark:text-neutral-400">
            {accountName}
          </span>
          <button
            aria-label={t('app.toggleTheme')}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-black/[0.04] hover:text-neutral-900 dark:hover:bg-white/[0.05] dark:hover:text-white"
            onClick={() => setDarkMode(!darkMode)}
            title={t('app.toggleTheme')}
            type="button"
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <main className="flex w-full flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
        <div className="mx-auto w-full max-w-[480px] space-y-8">
          <div className="space-y-2 text-center">
            <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-[#111827] sm:text-[32px] dark:text-white">
              {t('onboarding.title')}
            </h1>
            <p className="text-[14px] text-neutral-500 dark:text-neutral-400">
              {t('onboarding.description')}
            </p>
          </div>

          {hasSubmitError && (
            <div
              className="flex items-start gap-2 rounded-xl border border-red-200/80 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{t('onboarding.createError')}</span>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label
                className="block text-[13px] font-medium text-[#374151] dark:text-neutral-200"
                htmlFor="onboarding-organization"
              >
                {t('onboarding.organizationLabel')}
              </label>
              <input
                autoComplete="organization"
                className="h-10 w-full rounded-lg border border-black/[0.12] bg-white px-3.5 text-[14px] text-[#111827] shadow-2xs transition-all placeholder:text-neutral-400 focus:border-[#111827] focus:ring-1 focus:ring-[#111827] focus:outline-none dark:border-white/[0.14] dark:bg-[#1a1b1e] dark:text-white dark:focus:border-white dark:focus:ring-white"
                id="onboarding-organization"
                maxLength={100}
                onChange={(event) => setOrganizationName(event.target.value)}
                placeholder={t('onboarding.organizationPlaceholder')}
                required
                value={organizationName}
              />
              {organizationName && !organizationSlug && (
                <p className="text-[11px] text-red-500">{t('onboarding.slugHint')}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-[13px] font-medium text-[#374151] dark:text-neutral-200">
                  {t('onboarding.regionLabel')}
                </label>
                {isLoadingRegions && (
                  <span className="flex items-center gap-1 font-mono text-[11px] text-neutral-400">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    <span>{t('onboarding.loadingRegions')}</span>
                  </span>
                )}
              </div>

              <div className="overflow-hidden rounded-xl border border-black/[0.12] bg-white shadow-2xs dark:border-white/[0.14] dark:bg-[#1a1b1e]">
                <div className="flex border-b border-black/[0.08] bg-neutral-50/70 dark:border-white/[0.08] dark:bg-white/[0.02]">
                  <div className="flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-[12px] font-semibold text-[#111827] dark:text-white">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span>{t('onboarding.openRegions')}</span>
                  </div>
                </div>

                <div
                  aria-label={t('onboarding.regionLabel')}
                  className="divide-y divide-black/[0.06] dark:divide-white/[0.06]"
                  role="radiogroup"
                >
                  {isLoadingRegions ? (
                    <div className="animate-pulse space-y-2.5 p-4" aria-hidden="true">
                      <div className="flex items-center justify-between">
                        <div className="h-4 w-48 rounded bg-neutral-200 dark:bg-neutral-800" />
                        <div className="h-4 w-4 rounded-full bg-neutral-200 dark:bg-neutral-800" />
                      </div>
                      <div className="h-3 w-28 rounded bg-neutral-100 dark:bg-neutral-800/60" />
                    </div>
                  ) : hasLoadError ? (
                    <div
                      className="flex items-center justify-between p-4 text-xs text-red-600 dark:text-red-400"
                      role="alert"
                    >
                      <span>{t('onboarding.regionError')}</span>
                      <button
                        className="ml-2 font-medium underline hover:text-red-800 dark:hover:text-red-300"
                        onClick={() => void loadRegions()}
                        type="button"
                      >
                        {t('onboarding.retry')}
                      </button>
                    </div>
                  ) : regions.length === 0 ? (
                    <div className="p-4 text-xs text-neutral-500 dark:text-neutral-400">
                      {t('onboarding.noRegions')}
                    </div>
                  ) : (
                    regions.map((region) => {
                      const isSelected = selectedRegionCode === region.code
                      return (
                        <button
                          aria-checked={isSelected}
                          className={`flex w-full items-center justify-between p-3.5 text-left transition-colors ${isSelected ? 'bg-neutral-100/70 dark:bg-white/[0.05]' : 'hover:bg-neutral-50 dark:hover:bg-white/[0.02]'}`}
                          key={region.code}
                          onClick={() => setSelectedRegionCode(region.code)}
                          role="radio"
                          type="button"
                        >
                          <span className="space-y-0.5">
                            <span className="flex items-center gap-2">
                              <span className="text-[13px] font-semibold text-[#111827] dark:text-white">
                                {region.name}
                              </span>
                              <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                {t('onboarding.available')}
                              </span>
                            </span>
                            <span className="block text-[11px] text-neutral-500 dark:text-neutral-400">
                              {region.code}
                            </span>
                          </span>
                          <span
                            className={`flex h-4 w-4 items-center justify-center rounded-full transition-all ${isSelected ? 'bg-[#111827] text-white dark:bg-white dark:text-[#111827]' : 'border border-neutral-300 dark:border-neutral-600'}`}
                            aria-hidden="true"
                          >
                            {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                          </span>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>

              <div className="flex items-start gap-1.5 pt-1 text-[11.5px] leading-normal text-neutral-500 dark:text-neutral-400">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
                <span>{t('onboarding.regionReadonly')}</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label className="block text-[13px] font-medium text-[#374151] dark:text-neutral-200">
                  {t('onboarding.clusterLabel')}
                </label>
                <span className="font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
                  {selectedRegion?.defaultSpecKey ?? t('onboarding.regionDefault')}
                </span>
              </div>

              <div className="space-y-2.5 rounded-xl border border-black/[0.08] bg-white p-3.5 shadow-2xs dark:border-white/[0.1] dark:bg-[#1a1b1e]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13px] font-semibold text-[#111827] dark:text-white">
                    {clusterName || t('onboarding.clusterPreviewEmpty')}
                  </span>
                  <span className="font-mono text-[11px] text-neutral-400">
                    {selectedRegion?.code}
                  </span>
                </div>
                <p className="m-0 text-[11.5px] text-neutral-500 dark:text-neutral-400">
                  {t('onboarding.clusterPendingNote')}
                </p>
              </div>
            </div>

            <button
              className="mt-4 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#111827] text-[13.5px] font-medium text-white shadow-xs transition-all hover:bg-[#1f2937] active:scale-[0.99] disabled:opacity-50 dark:bg-white dark:text-[#111827] dark:hover:bg-neutral-100"
              disabled={
                isLoadingRegions ||
                hasLoadError ||
                !selectedRegion ||
                !organizationSlug ||
                isSubmitting
              }
              type="submit"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>{t('onboarding.creating')}</span>
                </>
              ) : (
                <>
                  <span>{t('onboarding.createAction')}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="flex items-center justify-between border-t border-black/[0.05] pt-4 text-[11px] text-neutral-400 dark:border-white/[0.06]">
            <span>{t('onboarding.footnote')}</span>
            <span className="hidden sm:inline">{accountName}</span>
          </div>
        </div>
      </main>
    </div>
  )
}
