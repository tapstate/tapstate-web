import { AlertDialog, AlertDialogContent } from './vendor/alert-dialog'
import {
  Dialog as SourceDialog,
  DialogBackdrop as SourceDialogBackdrop,
  DialogBody as SourceDialogBody,
  DialogClose as SourceDialogClose,
  DialogCloseButton as SourceDialogCloseButton,
  DialogContent as SourceDialogContent,
  DialogDescription as SourceDialogDescription,
  DialogFooter as SourceDialogFooter,
  DialogHeader as SourceDialogHeader,
  DialogPortal as SourceDialogPortal,
  DialogTitle as SourceDialogTitle,
  DialogTrigger as SourceDialogTrigger,
} from './vendor/dialog'
import { Drawer, DrawerContent } from './vendor/drawer'
import * as React from 'react'

import { Button } from './button'

const DialogCloseLabelContext = React.createContext('Close')

export function DialogProvider({
  children,
  closeLabel,
}: {
  children: React.ReactNode
  closeLabel: string
}) {
  return (
    <DialogCloseLabelContext.Provider value={closeLabel}>
      {children}
    </DialogCloseLabelContext.Provider>
  )
}

type DialogRootProps = React.ComponentProps<typeof SourceDialog>
type ComposedButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean
}

function Dialog(props: DialogRootProps) {
  return <SourceDialog {...props} />
}

function DialogTrigger({ asChild = false, children, ...props }: ComposedButtonProps) {
  const child = asChild && React.isValidElement(children) ? children : undefined
  return (
    <SourceDialogTrigger data-slot="dialog-trigger" render={child} {...props}>
      {child ? undefined : children}
    </SourceDialogTrigger>
  )
}

function DialogPortal(props: React.ComponentProps<typeof SourceDialogPortal>) {
  return <SourceDialogPortal {...props} />
}

function DialogClose({ asChild = false, children, ...props }: ComposedButtonProps) {
  const child = asChild && React.isValidElement(children) ? children : undefined
  return (
    <SourceDialogClose data-slot="dialog-close" render={child} {...props}>
      {child ? undefined : children}
    </SourceDialogClose>
  )
}

function DialogOverlay(props: React.ComponentProps<typeof SourceDialogBackdrop>) {
  return <SourceDialogBackdrop data-slot="dialog-overlay" {...props} />
}

type DialogContentProps = Omit<React.ComponentProps<typeof SourceDialogContent>, 'children'> & {
  children: React.ReactNode
  closeDisabled?: boolean
  closeLabel?: string
  overlayClassName?: string
  showCloseButton?: boolean
  size?: 'medium' | 'large'
}

function DialogContent({
  children,
  closeDisabled = false,
  closeLabel,
  overlayClassName,
  showCloseButton = true,
  size = 'medium',
  ...props
}: DialogContentProps) {
  const defaultCloseLabel = React.useContext(DialogCloseLabelContext)
  return (
    <SourceDialogContent
      data-slot="dialog-content"
      data-size={size}
      backdropProps={{ className: overlayClassName }}
      {...props}
    >
      {children}
      {showCloseButton && (
        <SourceDialogCloseButton
          disabled={closeDisabled}
          aria-label={closeLabel ?? defaultCloseLabel}
        />
      )}
    </SourceDialogContent>
  )
}

function DialogHeader(props: React.ComponentProps<typeof SourceDialogHeader>) {
  return <SourceDialogHeader data-slot="dialog-header" {...props} />
}

function DialogBody(props: React.ComponentProps<typeof SourceDialogBody>) {
  return <SourceDialogBody data-slot="dialog-body" {...props} />
}

function DialogFooter({
  closeLabel,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<typeof SourceDialogFooter> & {
  closeLabel?: string
  showCloseButton?: boolean
}) {
  const defaultCloseLabel = React.useContext(DialogCloseLabelContext)
  const resolvedCloseLabel = closeLabel ?? defaultCloseLabel
  return (
    <SourceDialogFooter data-slot="dialog-footer" {...props}>
      {children}
      {showCloseButton && (
        <DialogClose asChild>
          <Button variant="secondary" aria-label={resolvedCloseLabel}>
            {resolvedCloseLabel}
          </Button>
        </DialogClose>
      )}
    </SourceDialogFooter>
  )
}

function DialogTitle(props: React.ComponentProps<typeof SourceDialogTitle>) {
  return <SourceDialogTitle {...props} />
}

function DialogDescription(props: React.ComponentProps<typeof SourceDialogDescription>) {
  return <SourceDialogDescription {...props} />
}

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
  AlertDialog,
  AlertDialogContent,
  Drawer,
  DrawerContent,
}
