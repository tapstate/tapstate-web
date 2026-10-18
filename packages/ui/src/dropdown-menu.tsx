import { Menu as MenuPrimitive } from '@base-ui/react/menu'
import { CheckIcon, ChevronRightIcon } from 'lucide-react'
import * as React from 'react'

import { cn } from './cn'

interface DropdownMenuRootProps {
  children?: React.ReactNode
  open?: boolean
  defaultOpen?: boolean
  modal?: boolean
  onOpenChange?: (open: boolean) => void
}

type DropdownMenuTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean
  render?: React.ReactElement
}

interface PositionProps {
  align?: 'start' | 'center' | 'end'
  alignOffset?: number
  side?: 'top' | 'right' | 'bottom' | 'left'
  sideOffset?: number
}

function DropdownMenu(props: DropdownMenuRootProps) {
  return <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuPortal({ children }: { children?: React.ReactNode }) {
  return <MenuPrimitive.Portal data-slot="dropdown-menu-portal">{children}</MenuPrimitive.Portal>
}

function DropdownMenuTrigger({
  asChild = false,
  render,
  children,
  ...props
}: DropdownMenuTriggerProps) {
  const child = render ?? (asChild && React.isValidElement(children) ? children : undefined)
  return (
    <MenuPrimitive.Trigger data-slot="dropdown-menu-trigger" render={child} {...props}>
      {child ? undefined : children}
    </MenuPrimitive.Trigger>
  )
}

function DropdownMenuContent({
  align = 'start',
  alignOffset = 0,
  side = 'bottom',
  sideOffset = 4,
  className,
  ...props
}: React.ComponentProps<'div'> & PositionProps) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        className="ui-menu-positioner"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          className={cn('ui-menu-popup', className)}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  )
}

function DropdownMenuGroup(props: React.ComponentProps<'div'>) {
  return <MenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
}

function DropdownMenuLabel({ className, ...props }: React.ComponentProps<'div'>) {
  return <MenuPrimitive.GroupLabel className={cn('ui-menu-label', className)} {...props} />
}

function DropdownMenuItem({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'div'> & {
  variant?: 'default' | 'destructive'
  value?: string
  disabled?: boolean
  onSelect?: (event: Event) => void
}) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-tone={variant === 'destructive' ? 'danger' : 'neutral'}
      className={cn('ui-menu-item', className)}
      {...props}
    />
  )
}

function DropdownMenuSub(props: DropdownMenuRootProps) {
  return <MenuPrimitive.SubmenuRoot data-slot="dropdown-menu-sub" {...props} />
}

function DropdownMenuSubTrigger({ className, children, ...props }: React.ComponentProps<'div'>) {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot="dropdown-menu-sub-trigger"
      className={cn('ui-menu-item', className)}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ui-menu-chevron" aria-hidden="true" size={14} />
    </MenuPrimitive.SubmenuTrigger>
  )
}

function DropdownMenuSubContent(props: React.ComponentProps<typeof DropdownMenuContent>) {
  return (
    <DropdownMenuContent align="start" alignOffset={-3} side="right" sideOffset={0} {...props} />
  )
}

function DropdownMenuCheckboxItem({
  className,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  name?: string
  value?: string
}) {
  return (
    <MenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn('ui-menu-item ui-menu-check-item', className)}
      {...props}
    >
      <MenuPrimitive.CheckboxItemIndicator className="ui-menu-indicator">
        <CheckIcon aria-hidden="true" size={14} />
      </MenuPrimitive.CheckboxItemIndicator>
      {children}
    </MenuPrimitive.CheckboxItem>
  )
}

function DropdownMenuRadioGroup({
  value,
  defaultValue,
  onValueChange,
  children,
}: {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  children?: React.ReactNode
}) {
  return (
    <MenuPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
    >
      {children}
    </MenuPrimitive.RadioGroup>
  )
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<'div'> & { value: string; disabled?: boolean }) {
  return (
    <MenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn('ui-menu-item ui-menu-check-item', className)}
      {...props}
    >
      <MenuPrimitive.RadioItemIndicator className="ui-menu-indicator">
        <CheckIcon aria-hidden="true" size={14} />
      </MenuPrimitive.RadioItemIndicator>
      {children}
    </MenuPrimitive.RadioItem>
  )
}

function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<'div'>) {
  return <MenuPrimitive.Separator className={cn('ui-menu-separator', className)} {...props} />
}

function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<'kbd'>) {
  return <kbd className={cn('ui-menu-shortcut', className)} {...props} />
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
