import { cn } from '@tapstate-web/ui/cn'
import {
  RadioControl as SourceRadioControl,
  RadioGroup as SourceRadioGroup,
  RadioItem as SourceRadioItem,
  type RadioGroupProps as SourceRadioGroupProps,
  type RadioItemProps,
} from '@tapstate-web/ui/radio-group'

type RadioGroupItemTone = 'default' | 'destructive'
type RadioGroupItemProps<Value = string> = RadioItemProps<Value> & {
  tone?: RadioGroupItemTone
}

function RadioGroup<Value = string>({ className, ...props }: SourceRadioGroupProps<Value>) {
  return <SourceRadioGroup className={cn('flex flex-col gap-2', className)} {...props} />
}

function RadioGroupItem<Value = string>({
  className,
  tone = 'default',
  ...props
}: RadioGroupItemProps<Value>) {
  const controlClassName =
    tone === 'destructive'
      ? 'border-state-danger-border data-checked:border-state-danger-text'
      : undefined

  return (
    <SourceRadioItem className={className} {...props}>
      <SourceRadioControl className={controlClassName} />
    </SourceRadioItem>
  )
}

export { RadioGroup, RadioGroupItem }
