import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Compass,
  Database,
  Eye,
  Layers,
  Layers2,
  Rocket,
  Sparkles,
  Workflow,
  X,
} from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import type { Customer360Preset } from '../model/customer-360-guide'

export const CUSTOMER_360_GUIDE_STEPS = [
  { id: 'root', targetId: 'step-root-table', icon: Database, theme: 'blue' },
  { id: 'relations', targetId: 'step-first-relation', icon: Layers, theme: 'indigo' },
  { id: 'transform', targetId: 'step-doc-process', icon: Workflow, theme: 'purple' },
  { id: 'preview', targetId: 'step-preview-panel', icon: Eye, theme: 'emerald' },
  { id: 'launch', targetId: 'step-publish-action', icon: Rocket, theme: 'amber' },
] as const

export type Customer360GuideMode = 'storyboard' | 'in-situ'

const calloutThemes = {
  blue: {
    wrapper: 'bg-blue-50/90 border-blue-200/90 text-blue-950',
    badge: 'bg-blue-100/90 text-blue-700 border-blue-200',
    code: 'bg-blue-100/60 text-blue-800 border-blue-200/60',
    button: 'bg-blue-600 hover:bg-blue-700 text-white',
    activeDot: 'bg-blue-600',
    pastDot: 'bg-blue-300',
  },
  indigo: {
    wrapper: 'bg-indigo-50/90 border-indigo-200/90 text-indigo-950',
    badge: 'bg-indigo-100/90 text-indigo-700 border-indigo-200',
    code: 'bg-indigo-100/60 text-indigo-800 border-indigo-200/60',
    button: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    activeDot: 'bg-indigo-600',
    pastDot: 'bg-indigo-300',
  },
  purple: {
    wrapper: 'bg-purple-50/90 border-purple-200/90 text-purple-950',
    badge: 'bg-purple-100/90 text-purple-700 border-purple-200',
    code: 'bg-purple-100/60 text-purple-800 border-purple-200/60',
    button: 'bg-purple-600 hover:bg-purple-700 text-white',
    activeDot: 'bg-purple-600',
    pastDot: 'bg-purple-300',
  },
  emerald: {
    wrapper: 'bg-emerald-50/90 border-emerald-200/90 text-emerald-950',
    badge: 'bg-emerald-100/90 text-emerald-800 border-emerald-200',
    code: 'bg-emerald-100/60 text-emerald-800 border-emerald-200/60',
    button: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    activeDot: 'bg-emerald-600',
    pastDot: 'bg-emerald-300',
  },
  amber: {
    wrapper: 'bg-amber-50/90 border-amber-200/90 text-amber-950',
    badge: 'bg-amber-100/90 text-amber-800 border-amber-200',
    code: 'bg-amber-100/60 text-amber-800 border-amber-200/60',
    button: 'bg-amber-600 hover:bg-amber-700 text-white',
    activeDot: 'bg-amber-600',
    pastDot: 'bg-amber-300',
  },
} as const

export function PipelineBuilderGuideStepCard({
  step,
  fixedPreset,
  preset,
  targetCollection,
  onClose,
  onPrevious,
  onNext,
}: {
  step: number
  fixedPreset: boolean
  preset: Customer360Preset | null
  targetCollection: string
  onClose: () => void
  onPrevious: () => void
  onNext: () => void
}) {
  const { t } = useTranslation()
  const current = CUSTOMER_360_GUIDE_STEPS[step] ?? CUSTOMER_360_GUIDE_STEPS[0]
  const theme = calloutThemes[current.theme]
  const translationKey =
    fixedPreset && current.id === 'transform'
      ? 'wizard.guide.fixedTransform'
      : `wizard.guide.steps.${current.id}`
  const sourceName = preset?.sourceId ?? ''
  const rootTable = preset?.root.name ?? 'customers'
  const ordersTable = preset?.orders.name ?? 'orders'
  const itemsTable = preset?.items.name ?? 'items'
  const detail =
    step === 0
      ? preset
        ? `${sourceName}.${rootTable} → ${targetCollection} (_id)`
        : ''
      : step === 1 && preset
        ? `${ordersTable} → orders[] · ${itemsTable} → items[] · ${t('wizard.guide.joinCount', {
            first: preset.rootOrderJoin.length,
            second: preset.orderItemsJoin.length,
          })}`
        : step === 2
          ? t('wizard.guide.fixedTransformNote')
          : step === 3
            ? `${t('wizard.destinationContext')}: ${targetCollection}`
            : t('wizard.guide.steps.launch.calloutDetail')
  const nextKey = `${translationKey}.calloutNext`
  const isLast = step === CUSTOMER_360_GUIDE_STEPS.length - 1

  return (
    <div
      onClick={(event) => event.stopPropagation()}
      className={cn(
        'animate-in fade-in slide-in-from-top-1 mb-3.5 w-full rounded-xl border p-3.5 shadow-xs transition-all duration-200 sm:p-4',
        theme.wrapper,
      )}
      data-guide-callout="canvas"
      role="region"
      aria-label={t('wizard.guide.stepOf', { step: step + 1, total: 5 })}
      aria-live="polite"
    >
      <div className="flex items-center justify-between border-b border-black/[0.06] pb-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
              theme.badge,
            )}
          >
            <Sparkles className="size-3.5" aria-hidden="true" />
            <span>
              {t('wizard.guide.calloutBadge', {
                step: step + 1,
                title: t(`${translationKey}.shortTitle`),
              })}
            </span>
          </span>
          <div className="ml-1.5 flex shrink-0 items-center gap-1" aria-hidden="true">
            {CUSTOMER_360_GUIDE_STEPS.map((item, index) => (
              <span
                key={item.id}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  index === step
                    ? cn('w-4', theme.activeDot)
                    : index < step
                      ? cn('w-2', theme.pastDot)
                      : 'w-1.5 bg-black/15',
                )}
              />
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-md p-1 text-gray-400 transition-colors hover:bg-black/5 hover:text-gray-700"
          title={t('wizard.guide.close')}
          aria-label={t('wizard.guide.close')}
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-1.5 pt-2.5 pb-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-[13.5px] leading-snug font-bold text-gray-900">
            {t(`${translationKey}.title`)}
          </h4>
          {detail && (
            <code
              className={cn('rounded border px-1.5 py-0.5 font-mono text-[10.5px]', theme.code)}
            >
              {detail}
            </code>
          )}
        </div>
        <p className="text-[12.5px] leading-relaxed font-normal text-gray-700">
          {t(`${translationKey}.body`, {
            rootTable,
            ordersTable,
            itemsTable,
            amountField: preset?.amountField ?? 'amount',
          })}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-black/[0.06] pt-2">
        <span className="text-[11px] font-medium text-gray-500">
          {t(fixedPreset ? 'wizard.guide.calloutLockedHint' : 'wizard.guide.calloutHint')}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          {step > 0 && (
            <button
              type="button"
              onClick={onPrevious}
              className="inline-flex cursor-pointer items-center gap-0.5 rounded-md border border-black/10 bg-white/80 px-2.5 py-1 text-[11.5px] font-medium text-gray-700 transition-colors hover:bg-white hover:text-gray-900"
            >
              <ChevronLeft className="size-3.5" aria-hidden="true" />
              {t('wizard.guide.previous')}
            </button>
          )}
          <button
            type="button"
            onClick={onNext}
            className={cn(
              'flex cursor-pointer items-center gap-1 rounded-md px-3.5 py-1 text-[12px] font-semibold shadow-2xs transition-all active:scale-95',
              theme.button,
            )}
          >
            <span>{t(nextKey)}</span>
            {isLast ? (
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
            ) : (
              <ChevronRight className="size-3.5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

const guideThemes = {
  blue: {
    card: 'border-blue-200/90 bg-blue-50/90',
    badge: 'border-blue-200 bg-blue-100/90 text-blue-700',
    dot: 'bg-blue-600',
    past: 'bg-blue-300',
  },
  indigo: {
    card: 'border-indigo-200/90 bg-indigo-50/90',
    badge: 'border-indigo-200 bg-indigo-100/90 text-indigo-700',
    dot: 'bg-indigo-600',
    past: 'bg-indigo-300',
  },
  purple: {
    card: 'border-purple-200/90 bg-purple-50/90',
    badge: 'border-purple-200 bg-purple-100/90 text-purple-700',
    dot: 'bg-purple-600',
    past: 'bg-purple-300',
  },
  emerald: {
    card: 'border-emerald-200/90 bg-emerald-50/90',
    badge: 'border-emerald-200 bg-emerald-100/90 text-emerald-700',
    dot: 'bg-emerald-600',
    past: 'bg-emerald-300',
  },
  amber: {
    card: 'border-amber-200/90 bg-amber-50/90',
    badge: 'border-amber-200 bg-amber-100/90 text-amber-800',
    dot: 'bg-amber-600',
    past: 'bg-amber-300',
  },
} as const

export function PipelineBuilderGuide({
  open,
  fixedPreset = false,
  step,
  mode,
  preset,
  emptyDraft,
  presetApplied,
  formulaAdded,
  onOpen,
  onClose,
  onStepChange,
  onModeChange,
  onApplyPreset,
  onAddFormula,
  onSaveDraft,
  onLaunch,
}: {
  open: boolean
  fixedPreset?: boolean
  step: number
  mode: Customer360GuideMode
  preset: Customer360Preset | null
  emptyDraft: boolean
  presetApplied: boolean
  formulaAdded: boolean
  onOpen: () => void
  onClose: () => void
  onStepChange: (step: number) => void
  onModeChange: (mode: Customer360GuideMode) => void
  onApplyPreset: () => void
  onAddFormula: () => void
  onSaveDraft: () => void
  onLaunch: () => void
}) {
  const { t } = useTranslation()
  const current = CUSTOMER_360_GUIDE_STEPS[step] ?? CUSTOMER_360_GUIDE_STEPS[0]
  const theme = guideThemes[current.theme]
  const translationKey =
    fixedPreset && current.id === 'transform'
      ? 'wizard.guide.fixedTransform'
      : `wizard.guide.steps.${current.id}`
  useEffect(() => {
    if (!open) return
    const handleGuideKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (
        target?.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '')
      )
        return
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      } else if (event.key === 'ArrowLeft' && step > 0) {
        event.preventDefault()
        onStepChange(step - 1)
      } else if (event.key === 'ArrowRight' && step < CUSTOMER_360_GUIDE_STEPS.length - 1) {
        event.preventDefault()
        onStepChange(step + 1)
      }
    }
    window.addEventListener('keydown', handleGuideKeyDown)
    return () => window.removeEventListener('keydown', handleGuideKeyDown)
  }, [open, step, onClose, onStepChange])

  const stepDetails = (
    <div
      className="flex flex-wrap items-start justify-between gap-4 bg-gradient-to-r from-slate-50/40 via-white to-blue-50/20 px-5 py-3"
      role="region"
      aria-live="polite"
      aria-label={t('wizard.guide.stepOf', { step: step + 1, total: 5 })}
    >
      <div className="min-w-0 flex-1 basis-64">
        <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
          <span
            className={cn('rounded-full border px-2 py-0.5 text-[10.5px] font-bold', theme.badge)}
          >
            {t('wizard.guide.stepOf', { step: step + 1, total: 5 })}
          </span>
          <h3 className="text-[13.5px] font-bold text-slate-900">{t(`${translationKey}.title`)}</h3>
          <span className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-500">
            {t(`${translationKey}.shortTitle`)}
          </span>
        </div>
        <p className="max-w-3xl text-[12.5px] leading-relaxed text-slate-700">
          {t(`${translationKey}.body`, {
            rootTable: preset?.root.name ?? 'customers',
            ordersTable: preset?.orders.name ?? 'orders',
            itemsTable: preset?.items.name ?? 'items',
            amountField: preset?.amountField ?? 'amount',
          })}
        </p>

        {step === 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {preset ? (
              <>
                <span className="text-foreground font-medium">{preset.sourceId}</span>
                <code className="bg-muted rounded px-1.5 py-0.5">{preset.root.name}</code>
                <span className="text-muted-foreground">
                  {t('wizard.guide.primaryKey', {
                    keys: preset.root.keys?.join(', ') || preset.root.primaryKey,
                  })}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">{t('wizard.guide.noSample')}</span>
            )}
          </div>
        )}

        {step === 1 && preset && (
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <code className="bg-muted rounded px-1.5 py-0.5">{preset.orders.name} → orders[]</code>
            <code className="bg-muted rounded px-1.5 py-0.5">{preset.items.name} → items[]</code>
            <span className="text-muted-foreground">
              {t('wizard.guide.joinCount', {
                first: preset.rootOrderJoin.length,
                second: preset.orderItemsJoin.length,
              })}
            </span>
          </div>
        )}

        {step === 2 && fixedPreset && (
          <p className="text-muted-foreground mt-2 text-xs">
            {t('wizard.guide.fixedTransformNote')}
          </p>
        )}

        {step === 2 && !fixedPreset && preset?.amountField && presetApplied && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="bg-muted text-foreground rounded px-2 py-1 text-[11px]">
              {`orders.map(o, o.items.map(i, i.${preset.amountField}).sum()).sum()`}
            </code>
            {formulaAdded ? (
              <span className="text-warning inline-flex items-center gap-1 text-xs">
                <Check className="size-3.5" aria-hidden="true" />
                {t('wizard.guide.formulaAdded')}
              </span>
            ) : (
              <Button type="button" size="sm" variant="outline" onClick={onAddFormula}>
                {t('wizard.guide.addFormula')}
              </Button>
            )}
          </div>
        )}

        {step === 2 && !fixedPreset && preset?.amountField && !presetApplied && (
          <p className="text-muted-foreground mt-2 text-xs">
            {t('wizard.guide.applyBeforeFormula')}
          </p>
        )}

        {step === 2 && !fixedPreset && formulaAdded && (
          <p className="text-warning mt-2 text-xs" role="status">
            {t('wizard.guide.formulaUnavailable')}
          </p>
        )}

        {step === 3 && (
          <p className="text-muted-foreground mt-2 text-xs">{t('wizard.guide.previewNote')}</p>
        )}

        {step === 4 && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {formulaAdded && !fixedPreset ? (
              <p className="text-warning text-xs">{t('wizard.guide.saveOnly')}</p>
            ) : null}
            <Button type="button" size="sm" variant="outline" onClick={onSaveDraft}>
              {t('wizard.guide.saveDraft')}
            </Button>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2 self-end">
        {step === 0 && !fixedPreset && preset && emptyDraft && !presetApplied && (
          <Button type="button" size="sm" onClick={onApplyPreset}>
            {t('wizard.guide.applyPreset')}
          </Button>
        )}
        {presetApplied && step === 0 && (
          <span className="text-success inline-flex items-center gap-1 text-xs">
            <Check className="size-3.5" aria-hidden="true" />
            {t('wizard.guide.presetApplied')}
          </span>
        )}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={step === 0}
          onClick={() => onStepChange(Math.max(0, step - 1))}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          {t('wizard.guide.previous')}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={step === 4 && formulaAdded}
          onClick={() => (step === 4 ? onLaunch() : onStepChange(step + 1))}
          className={
            step === 4
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }
        >
          {step === 4 ? t('wizard.guide.launch') : t('wizard.guide.next')}
          {step === 4 ? (
            <Rocket className="size-3.5" aria-hidden="true" />
          ) : (
            <ChevronRight className="size-4" aria-hidden="true" />
          )}
        </Button>
      </div>
    </div>
  )

  if (!open)
    return (
      <div className="border-border flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2">
        <span className="text-muted-foreground text-xs">{t('wizard.guide.collapsed')}</span>
        <Button type="button" size="sm" variant="outline" onClick={onOpen}>
          <CircleHelp className="size-3.5" aria-hidden="true" />
          {t('wizard.guide.open')}
        </Button>
      </div>
    )

  return (
    <>
      <section
        aria-labelledby="customer-360-guide-title"
        className="z-20 shrink-0 border-b border-gray-200/90 bg-white shadow-xs"
        data-guide-mode={mode}
      >
        <div className="flex min-h-10 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-gray-100 bg-slate-50/70 px-4 py-1.5">
          <div className="flex min-w-0 items-center gap-2">
            <Sparkles className="size-3.5 shrink-0 text-blue-600" aria-hidden="true" />
            <h2
              id="customer-360-guide-title"
              className="text-[11px] font-semibold whitespace-nowrap text-slate-700"
            >
              {t('wizard.guide.title')}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <span className="mr-1 text-[10px] text-slate-500">{t('wizard.guide.mode')}</span>
            <Button
              type="button"
              size="sm"
              variant={mode === 'storyboard' ? 'outline' : 'ghost'}
              aria-pressed={mode === 'storyboard'}
              onClick={() => onModeChange('storyboard')}
            >
              <Compass className="size-3" aria-hidden="true" />
              {t('wizard.guide.storyboard')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === 'in-situ' ? 'outline' : 'ghost'}
              aria-pressed={mode === 'in-situ'}
              onClick={() => onModeChange('in-situ')}
            >
              <Layers2 className="size-3" aria-hidden="true" />
              {t('wizard.guide.inSitu')}
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label={t('wizard.guide.close')}
              onClick={onClose}
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        <nav
          aria-label={t('wizard.guide.stepsLabel')}
          className="flex min-w-0 gap-1 overflow-x-auto border-b border-gray-100 bg-slate-50/70 px-4 py-1.5"
        >
          {CUSTOMER_360_GUIDE_STEPS.map((item, index) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                aria-current={index === step ? 'step' : undefined}
                aria-controls={item.targetId}
                onClick={() => onStepChange(index)}
                className={cn(
                  'focus-visible:ring-ring flex min-h-7 shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-all focus-visible:ring-2 focus-visible:outline-none active:scale-[0.99]',
                  index === step
                    ? item.theme === 'blue'
                      ? 'border-blue-300 bg-blue-50 text-blue-800 ring-1 ring-blue-400/30'
                      : item.theme === 'indigo'
                        ? 'border-indigo-300 bg-indigo-50 text-indigo-800 ring-1 ring-indigo-400/30'
                        : item.theme === 'purple'
                          ? 'border-purple-300 bg-purple-50 text-purple-800 ring-1 ring-purple-400/30'
                          : item.theme === 'emerald'
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-400/30'
                            : 'border-amber-300 bg-amber-50 text-amber-800 ring-1 ring-amber-400/30'
                    : index < step
                      ? 'border-gray-200 bg-white/80 text-slate-700'
                      : 'border-transparent text-slate-400 hover:bg-white/50 hover:text-slate-600',
                )}
              >
                <Icon className="size-3" aria-hidden="true" />
                <span className="font-mono">{String(index + 1).padStart(2, '0')}</span>
                {t(
                  fixedPreset && item.id === 'transform'
                    ? 'wizard.guide.fixedTransform.shortTitle'
                    : `wizard.guide.steps.${item.id}.shortTitle`,
                )}
                {index === step && (
                  <span
                    className="size-1.5 animate-pulse rounded-full bg-blue-600"
                    aria-hidden="true"
                  />
                )}
              </button>
            )
          })}
        </nav>

        {mode === 'storyboard' && stepDetails}
      </section>
    </>
  )
}
