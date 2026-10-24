import {
  DropdownMenu as SourceDropdownMenu,
  DropdownMenuCheckboxItem as SourceCheckboxItem,
  DropdownMenuCheckboxItemIndicator as SourceCheckboxIndicator,
  DropdownMenuContent as SourceContent,
  DropdownMenuGroup as SourceGroup,
  DropdownMenuGroupLabel as SourceGroupLabel,
  DropdownMenuItem as SourceItem,
  DropdownMenuPortal as SourcePortal,
  DropdownMenuRadioGroup as SourceRadioGroup,
  DropdownMenuRadioItem as SourceRadioItem,
  DropdownMenuRadioItemIndicator as SourceRadioIndicator,
  DropdownMenuSeparator as SourceSeparator,
  DropdownMenuSub as SourceSub,
  DropdownMenuSubContent as SourceSubContent,
  DropdownMenuSubTrigger as SourceSubTrigger,
  DropdownMenuTrigger as SourceTrigger,
} from './vendor/dropdown-menu'
import { Kbd } from './vendor/kbd'
import * as React from 'react'

type PositionProps = {
  align?: 'start' | 'center' | 'end'
  alignOffset?: number
  side?: 'top' | 'right' | 'bottom' | 'left'
  sideOffset?: number
}

type TriggerProps = React.ComponentProps<typeof SourceTrigger> & {
  asChild?: boolean
}

function DropdownMenu(props: React.ComponentProps<typeof SourceDropdownMenu>) {
  return <SourceDropdownMenu {...props} />
}

function DropdownMenuPortal(props: React.ComponentProps<typeof SourcePortal>) {
  return <SourcePortal {...props} />
}

function DropdownMenuTrigger({ asChild = false, children, render, ...props }: TriggerProps) {
  const child = render ?? (asChild && React.isValidElement(children) ? children : undefined)
  return (
    <SourceTrigger data-slot="dropdown-menu-trigger" render={child} {...props}>
      {child ? undefined : children}
    </SourceTrigger>
  )
}

function DropdownMenuContent({
  align = 'start',
  side = 'bottom',
  ...props
}: React.ComponentProps<typeof SourceContent> & PositionProps) {
  return <SourceContent placement={align === 'center' ? side : `${side}-${align}`} {...props} />
}

function DropdownMenuGroup(props: React.ComponentProps<typeof SourceGroup>) {
  return <SourceGroup {...props} />
}

function DropdownMenuLabel(props: React.ComponentProps<typeof SourceGroupLabel>) {
  return <SourceGroupLabel {...props} />
}

function DropdownMenuItem(props: React.ComponentProps<typeof SourceItem>) {
  return <SourceItem {...props} />
}

function DropdownMenuSub(props: React.ComponentProps<typeof SourceSub>) {
  return <SourceSub {...props} />
}

function DropdownMenuSubTrigger(props: React.ComponentProps<typeof SourceSubTrigger>) {
  return <SourceSubTrigger {...props} />
}

function DropdownMenuSubContent(props: React.ComponentProps<typeof SourceSubContent>) {
  return <SourceSubContent {...props} />
}

function DropdownMenuCheckboxItem({
  children,
  ...props
}: React.ComponentProps<typeof SourceCheckboxItem>) {
  return (
    <SourceCheckboxItem {...props}>
      <SourceCheckboxIndicator />
      {children}
    </SourceCheckboxItem>
  )
}

function DropdownMenuRadioGroup(props: React.ComponentProps<typeof SourceRadioGroup<string>>) {
  return <SourceRadioGroup<string> {...props} />
}

function DropdownMenuRadioItem({
  children,
  ...props
}: React.ComponentProps<typeof SourceRadioItem<string>>) {
  return (
    <SourceRadioItem<string> {...props}>
      <SourceRadioIndicator />
      {children}
    </SourceRadioItem>
  )
}

function DropdownMenuSeparator(props: React.ComponentProps<typeof SourceSeparator>) {
  return <SourceSeparator {...props} />
}

function DropdownMenuShortcut(props: React.ComponentProps<typeof Kbd>) {
  return <Kbd {...props} />
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}
