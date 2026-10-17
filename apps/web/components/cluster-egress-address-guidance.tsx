import { Check, ChevronDown, Copy, Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

interface ClusterEgressAddressGuidanceProps {
  isLoading: boolean
  isError: boolean
  address: string | null
  status: string | null
  copied: boolean
  copyFailed: boolean
  onCopy: () => void
}

export function ClusterEgressAddressGuidance({
  isLoading,
  isError,
  address,
  status,
  copied,
  copyFailed,
  onCopy,
}: ClusterEgressAddressGuidanceProps) {
  const { t } = useTranslation()
  const addressChanging = status === 'STABILIZING' || status === 'ATTACHING'
  const addressMessage = isLoading
    ? t('sources.egressAddress.loading')
    : isError
      ? t('sources.egressAddress.unavailable')
      : addressChanging
        ? t('sources.egressAddress.changing')
        : status === 'STABLE' && address
          ? t('sources.egressAddress.stableHelp')
          : status === 'FAILED' && address
            ? t('sources.egressAddress.failedHelp')
            : status === 'DYNAMIC' && address
              ? t('sources.egressAddress.dynamicHelp')
              : address
                ? t('sources.egressAddress.currentHelp')
                : t('sources.egressAddress.missing')

  return (
    <section
      aria-label={t('sources.egressAddress.title')}
      className="grid min-w-0 gap-4 rounded-[14px] bg-[var(--info-fill)] px-5 py-4 sm:px-6"
    >
      <div className="flex min-w-0 items-start gap-4 sm:gap-6">
        <span className="text-primary-foreground mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-[var(--brand-primary)]">
          <Info className="size-4" aria-hidden="true" />
        </span>
        <div className="grid min-w-0 gap-1">
          <p className="text-muted-foreground text-[14px] leading-5 sm:text-[15px]">
            {addressMessage}
          </p>
          {isError && (
            <p className="text-muted-foreground text-[12px] leading-relaxed">
              {t('sources.egressAddress.continueSetup')}
            </p>
          )}
        </div>
      </div>

      {address && (
        <details open className="group bg-background -mx-2 min-w-0 rounded-xl sm:-mx-3">
          <summary className="focus-visible:outline-ring flex min-h-10 cursor-pointer list-none items-center gap-2.5 rounded-xl px-4 py-2 text-[14px] leading-5 font-medium text-[var(--brand-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 sm:text-[15px] [&::-webkit-details-marker]:hidden">
            <ChevronDown
              className="size-4 shrink-0 text-[var(--brand-primary)] transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
            <span>{t('sources.egressAddress.addressLabel')}</span>
          </summary>
          <div className="flex min-w-0 items-center gap-2 pr-4 pb-3 pl-10 sm:pr-4 sm:pb-3 sm:pl-10">
            <code className="text-foreground min-w-0 flex-1 font-mono text-sm leading-5 break-all">
              {address}
            </code>
            {!addressChanging && (
              <Button
                type="button"
                variant="outline"
                size="icon-lg"
                title={copied ? t('sources.egressAddress.copied') : t('sources.egressAddress.copy')}
                onClick={onCopy}
              >
                {copied ? (
                  <Check className="text-success size-4" aria-hidden="true" />
                ) : (
                  <Copy className="size-4" aria-hidden="true" />
                )}
                <span className="sr-only">
                  {copied ? t('sources.egressAddress.copied') : t('sources.egressAddress.copy')}
                </span>
              </Button>
            )}
          </div>
          {copyFailed && (
            <p className="text-destructive pr-4 pb-3 pl-10 text-[12px]" role="alert">
              {t('sources.egressAddress.copyFailed')}
            </p>
          )}
        </details>
      )}
    </section>
  )
}
