import { Check, ChevronLeft, ChevronRight, CircleHelp, Layers3, X } from 'lucide-react'
import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import type { Customer360Preset } from '../model/customer-360-guide'

export const CUSTOMER_360_GUIDE_STEPS = [
  { id: 'root', targetId: 'step-root-table' },
  { id: 'relations', targetId: 'step-first-relation' },
  { id: 'transform', targetId: 'step-doc-process' },
  { id: 'preview', targetId: 'step-preview-panel' },
  { id: 'launch', targetId: 'step-publish-action' },
] as const

export type Customer360GuideMode = 'storyboard' | 'in-situ'

export function PipelineBuilderGuide({
  open,
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
}: {
  open: boolean
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
}) {
  const { t } = useTranslation()
  const current = CUSTOMER_360_GUIDE_STEPS[step] ?? CUSTOMER_360_GUIDE_STEPS[0]
  const translationKey = `wizard.guide.steps.${current.id}`
  const [anchorPosition, setAnchorPosition] = useState<{ left: number; top: number } | null>(null)
  const inSituPanel = useRef<HTMLDivElement>(null)
  const handleGuideKeyDown = (event: KeyboardEvent<HTMLElement>) => {
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

  useLayoutEffect(() => {
    if (!open || mode !== 'in-situ') {
      setAnchorPosition(null)
      return
    }

    const updatePosition = () => {
      const target = document.getElementById(current.targetId)
      if (!target) {
        setAnchorPosition(null)
        return
      }
      const rect = target.getBoundingClientRect()
      const panel = inSituPanel.current
      const width = Math.min(360, window.innerWidth - 24)
      const height = panel?.offsetHeight || 250
      const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))
      const below = rect.bottom + 12
      const top =
        below + height <= window.innerHeight - 12
          ? below
          : Math.max(12, Math.min(rect.top - height - 12, window.innerHeight - height - 12))
      setAnchorPosition((previous) =>
        previous?.left === left && previous.top === top ? previous : { left, top },
      )
    }

    let frame = 0
    const scheduleUpdate = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(updatePosition)
    }
    updatePosition()
    window.addEventListener('resize', scheduleUpdate)
    window.addEventListener('scroll', scheduleUpdate, true)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', scheduleUpdate)
      window.removeEventListener('scroll', scheduleUpdate, true)
    }
  }, [current.targetId, mode, open, step])

  const stepDetails = (
    <div
      className={cn(
        'flex flex-wrap items-start justify-between gap-4 px-4 pb-3',
        mode === 'in-situ' ? 'border-primary/30 bg-primary/5 border-t py-3' : 'pt-1',
      )}
      role="region"
      aria-live="polite"
      aria-label={t('wizard.guide.stepOf', { step: step + 1, total: 5 })}
    >
      <div className="min-w-0 flex-1 basis-64">
        <p className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-wide uppercase">
          {t('wizard.guide.stepOf', { step: step + 1, total: 5 })}
        </p>
        <h3 className="text-foreground text-sm font-semibold">{t(`${translationKey}.title`)}</h3>
        <p className="text-muted-foreground mt-1 max-w-3xl text-xs leading-relaxed">
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

        {step === 2 && preset?.amountField && presetApplied && (
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

        {step === 2 && preset?.amountField && !presetApplied && (
          <p className="text-muted-foreground mt-2 text-xs">
            {t('wizard.guide.applyBeforeFormula')}
          </p>
        )}

        {step === 2 && formulaAdded && (
          <p className="text-warning mt-2 text-xs" role="status">
            {t('wizard.guide.formulaUnavailable')}
          </p>
        )}

        {step === 3 && (
          <p className="text-muted-foreground mt-2 text-xs">{t('wizard.guide.previewNote')}</p>
        )}

        {step === 4 && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {formulaAdded ? (
              <p className="text-warning text-xs">{t('wizard.guide.saveOnly')}</p>
            ) : null}
            <Button type="button" size="sm" variant="outline" onClick={onSaveDraft}>
              {t('wizard.guide.saveDraft')}
            </Button>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2 self-end">
        {step === 0 && preset && emptyDraft && !presetApplied && (
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
          variant="outline"
          disabled={step === CUSTOMER_360_GUIDE_STEPS.length - 1}
          onClick={() => onStepChange(Math.min(CUSTOMER_360_GUIDE_STEPS.length - 1, step + 1))}
        >
          {t('wizard.guide.next')}
          <ChevronRight className="size-4" aria-hidden="true" />
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
        className="border-border bg-card text-card-foreground shrink-0 border-b"
        data-guide-mode={mode}
        onKeyDown={handleGuideKeyDown}
      >
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="bg-primary/10 text-primary inline-flex size-7 shrink-0 items-center justify-center rounded-md">
              <Layers3 className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
                {t('wizard.guide.eyebrow')}
              </p>
              <h2 id="customer-360-guide-title" className="text-sm font-semibold">
                {t('wizard.guide.title')}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground mr-1 text-xs">{t('wizard.guide.mode')}</span>
            <Button
              type="button"
              size="sm"
              variant={mode === 'storyboard' ? 'secondary' : 'ghost'}
              aria-pressed={mode === 'storyboard'}
              onClick={() => onModeChange('storyboard')}
            >
              {t('wizard.guide.storyboard')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === 'in-situ' ? 'secondary' : 'ghost'}
              aria-pressed={mode === 'in-situ'}
              onClick={() => onModeChange('in-situ')}
            >
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
          className="flex min-w-0 gap-1 overflow-x-auto px-3 py-2"
        >
          {CUSTOMER_360_GUIDE_STEPS.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-current={index === step ? 'step' : undefined}
              aria-controls={item.targetId}
              onClick={() => onStepChange(index)}
              className={cn(
                'focus-visible:ring-ring flex min-h-8 shrink-0 items-center gap-2 rounded-md px-2.5 text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none active:scale-[0.99]',
                index === step
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <span
                className={cn(
                  'inline-flex size-4 items-center justify-center rounded-full text-[10px] font-semibold',
                  index === step
                    ? 'bg-primary-foreground/15 text-primary-foreground'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {index + 1}
              </span>
              {t(`wizard.guide.steps.${item.id}.shortTitle`)}
            </button>
          ))}
        </nav>

        {mode === 'storyboard' && stepDetails}
      </section>
      {mode === 'in-situ' && anchorPosition
        ? createPortal(
            <div
              ref={inSituPanel}
              className="border-primary/30 bg-card text-card-foreground fixed z-50 max-h-[min(70vh,420px)] w-[min(360px,calc(100vw-24px))] overflow-y-auto rounded-lg border shadow-lg"
              style={{ left: anchorPosition.left, top: anchorPosition.top }}
              data-guide-callout="in-situ"
              onKeyDown={handleGuideKeyDown}
            >
              {stepDetails}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
