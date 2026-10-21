import { cva } from 'class-variance-authority'
import { CircleCheck, CircleHelp, OctagonX, TriangleAlert, type LucideIcon } from 'lucide-react'
import { useId } from 'react'

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'

/** How strongly a check result bears on the action the person is about to take. */
export type CheckTone = 'blocking' | 'question' | 'warning' | 'passed'

export interface CheckChoice {
  value: string
  label: string
  /** Plain text shown under the label as written, such as the kind of answer. */
  detail?: string
  /** Marks a choice that removes or overwrites data. */
  destructive?: boolean
  /** Plain-text lines previewing what the choice changes. */
  preview?: readonly string[]
}

export interface CheckItem {
  id: string
  tone: CheckTone
  /** Names the tone in words; it is always shown beside its icon so no state rests on color. */
  toneLabel: string
  title: string
  /** Plain-text facts about the check, shown exactly as given. */
  meta?: readonly string[]
  message: string
  /** Answers the person picks one of; rendered as a radio group. */
  choices?: readonly CheckChoice[]
  /** Accessible name of the choice group. */
  choiceLabel?: string
  selected?: string | null
}

export interface CheckGroup {
  id: string
  title: string
  items: readonly CheckItem[]
}

const toneIcons: Record<CheckTone, LucideIcon> = {
  blocking: OctagonX,
  question: CircleHelp,
  warning: TriangleAlert,
  passed: CircleCheck,
}

const toneLabelVariants = cva(
  'inline-flex shrink-0 items-center gap-1 text-xs font-medium whitespace-nowrap',
  {
    variants: {
      tone: {
        blocking: 'text-destructive',
        question: 'text-foreground',
        warning: 'text-warning',
        passed: 'text-muted-foreground',
      },
    },
  },
)

const choiceVariants = cva(
  'flex cursor-pointer items-start gap-2 rounded-lg px-2 py-2 transition-colors has-data-disabled:cursor-not-allowed',
  {
    variants: {
      destructive: {
        true: 'hover:bg-destructive/10',
        false: 'hover:bg-muted',
      },
    },
    defaultVariants: { destructive: false },
  },
)

const choiceLabelVariants = cva('text-[13px] leading-relaxed break-words', {
  variants: {
    destructive: {
      true: 'text-destructive font-medium',
      false: 'text-foreground',
    },
  },
  defaultVariants: { destructive: false },
})

const plainTextLine = 'text-muted-foreground font-mono text-[11px] leading-relaxed break-words'

function CheckToneLabel({ tone, label }: { tone: CheckTone; label: string }) {
  const Icon = toneIcons[tone]
  return (
    <span className={toneLabelVariants({ tone })} data-check-tone-label={tone}>
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
    </span>
  )
}

function CheckChoices({
  item,
  disabled,
  onChoose,
}: {
  item: CheckItem
  disabled: boolean
  onChoose?: (itemId: string, value: string) => void
}) {
  return (
    <RadioGroup<string | null>
      aria-label={item.choiceLabel}
      className="gap-1"
      value={item.selected ?? null}
      disabled={disabled}
      onValueChange={(value) => {
        if (value !== null) onChoose?.(item.id, value)
      }}
    >
      {item.choices?.map((choice) => (
        <label
          key={choice.value}
          className={choiceVariants({ destructive: Boolean(choice.destructive) })}
          data-check-choice={choice.value}
          data-destructive={choice.destructive ? 'true' : undefined}
        >
          <RadioGroupItem
            value={choice.value}
            tone={choice.destructive ? 'destructive' : 'default'}
            className="mt-1"
          />
          <span className="grid min-w-0 gap-1">
            <span className={choiceLabelVariants({ destructive: Boolean(choice.destructive) })}>
              {choice.label}
            </span>
            {choice.detail ? <span className={plainTextLine}>{choice.detail}</span> : null}
            {choice.preview && choice.preview.length > 0 ? (
              <span className="grid" data-check-choice-preview>
                {choice.preview.map((line) => (
                  <span key={line} className={plainTextLine}>
                    {line}
                  </span>
                ))}
              </span>
            ) : null}
          </span>
        </label>
      ))}
    </RadioGroup>
  )
}

function CheckListItem({
  item,
  disabled,
  onChoose,
}: {
  item: CheckItem
  disabled: boolean
  onChoose?: (itemId: string, value: string) => void
}) {
  return (
    <li className="grid gap-2 py-3" data-check-item={item.id} data-check-tone={item.tone}>
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <CheckToneLabel tone={item.tone} label={item.toneLabel} />
        <span className="text-foreground min-w-0 text-[13px] font-medium break-words">
          {item.title}
        </span>
      </div>
      {item.meta && item.meta.length > 0 ? (
        <p className={plainTextLine}>{item.meta.join(' · ')}</p>
      ) : null}
      <p className="text-foreground text-[13px] leading-relaxed break-words">{item.message}</p>
      {item.choices && item.choices.length > 0 ? (
        <CheckChoices item={item} disabled={disabled} onChoose={onChoose} />
      ) : null}
    </li>
  )
}

function CheckListGroup({
  group,
  disabled,
  onChoose,
}: {
  group: CheckGroup
  disabled: boolean
  onChoose?: (itemId: string, value: string) => void
}) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} data-check-group={group.id}>
      <h3 id={headingId} className="text-muted-foreground text-xs font-medium">
        {group.title}
      </h3>
      <ul className="divide-border divide-y">
        {group.items.map((item) => (
          <CheckListItem key={item.id} item={item} disabled={disabled} onChoose={onChoose} />
        ))}
      </ul>
    </section>
  )
}

/**
 * Lists check results in groups, each with an icon and a text label for its tone, the subject, plain
 * facts and the message, and the choices a result offers. It knows nothing about what was checked:
 * callers decide the grouping, the order and every text.
 */
export function CheckList({
  groups,
  disabled = false,
  className,
  onChoose,
}: {
  groups: readonly CheckGroup[]
  disabled?: boolean
  className?: string
  onChoose?: (itemId: string, value: string) => void
}) {
  const visibleGroups = groups.filter((group) => group.items.length > 0)
  if (visibleGroups.length === 0) return null
  return (
    <div className={cn('grid gap-3', className)} data-check-list>
      {visibleGroups.map((group) => (
        <CheckListGroup key={group.id} group={group} disabled={disabled} onChoose={onChoose} />
      ))}
    </div>
  )
}
