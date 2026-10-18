import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { XIcon } from 'lucide-react'
import * as React from 'react'

import { Button } from './button'
import { cn } from './cn'

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

interface DialogRootProps {
  children?: React.ReactNode
  open?: boolean
  defaultOpen?: boolean
  modal?: boolean
  onOpenChange?: (open: boolean) => void
}

type ComposedButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean
}

function Dialog(props: DialogRootProps) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ asChild = false, children, ...props }: ComposedButtonProps) {
  const child = asChild && React.isValidElement(children) ? children : undefined
  return (
    <DialogPrimitive.Trigger data-slot="dialog-trigger" render={child} {...props}>
      {child ? undefined : children}
    </DialogPrimitive.Trigger>
  )
}

function DialogPortal({ children }: { children?: React.ReactNode }) {
  return <DialogPrimitive.Portal data-slot="dialog-portal">{children}</DialogPrimitive.Portal>
}

function DialogClose({ asChild = false, children, ...props }: ComposedButtonProps) {
  const child = asChild && React.isValidElement(children) ? children : undefined
  return (
    <DialogPrimitive.Close data-slot="dialog-close" render={child} {...props}>
      {child ? undefined : children}
    </DialogPrimitive.Close>
  )
}

function DialogOverlay({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn('ui-dialog-backdrop', className)}
      {...props}
    />
  )
}

interface DialogContentProps extends React.ComponentProps<'div'> {
  closeDisabled?: boolean
  closeLabel?: string
  overlayClassName?: string
  showCloseButton?: boolean
  size?: 'medium' | 'large'
}

function DialogContent({
  className,
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
    <DialogPortal>
      <DialogOverlay className={overlayClassName} />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        data-size={size}
        className={cn('ui-dialog-content', className)}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            disabled={closeDisabled}
            aria-label={closeLabel ?? defaultCloseLabel}
            className="ui-dialog-close"
          >
            <XIcon aria-hidden="true" size={16} />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('ui-dialog-header', className)} data-slot="dialog-header" {...props} />
}

function DialogBody({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('ui-dialog-body', className)} data-slot="dialog-body" {...props} />
}

function DialogFooter({
  className,
  closeLabel,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<'div'> & { closeLabel?: string; showCloseButton?: boolean }) {
  const defaultCloseLabel = React.useContext(DialogCloseLabelContext)
  const resolvedCloseLabel = closeLabel ?? defaultCloseLabel

  return (
    <div className={cn('ui-dialog-footer', className)} data-slot="dialog-footer" {...props}>
      {children}
      {showCloseButton && (
        <DialogClose asChild>
          <Button variant="secondary" aria-label={resolvedCloseLabel}>
            {resolvedCloseLabel}
          </Button>
        </DialogClose>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: React.ComponentProps<'h2'>) {
  return <DialogPrimitive.Title className={cn('ui-dialog-title', className)} {...props} />
}

function DialogDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <DialogPrimitive.Description className={cn('ui-dialog-description', className)} {...props} />
  )
}

function AlertDialog(props: DialogRootProps) {
  return <Dialog {...props} />
}

function AlertDialogContent(props: DialogContentProps) {
  return <DialogContent role="alertdialog" showCloseButton={false} {...props} />
}

function Drawer(props: DialogRootProps) {
  return <Dialog {...props} />
}

function DrawerContent({ className, ...props }: DialogContentProps) {
  return <DialogContent data-ui-drawer="right" className={className} {...props} />
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
