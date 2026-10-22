import type * as React from 'react'

import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog'

import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/**
 * A dialog that interrupts an action and asks for an explicit answer. It shares the Dialog surface,
 * but it is always modal, outside presses do not dismiss it, and it never renders a close icon:
 * the footer's explicit buttons are the only way to answer.
 */
function AlertDialog({ ...props }: AlertDialogPrimitive.Root.Props) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />
}

function AlertDialogContent({
  ...props
}: Omit<
  React.ComponentProps<typeof DialogContent>,
  'closeDisabled' | 'closeLabel' | 'showCloseButton'
>) {
  return <DialogContent data-slot="alert-dialog-content" {...props} showCloseButton={false} />
}

function AlertDialogHeader({ ...props }: React.ComponentProps<typeof DialogHeader>) {
  return <DialogHeader data-slot="alert-dialog-header" {...props} />
}

function AlertDialogFooter({
  ...props
}: Omit<React.ComponentProps<typeof DialogFooter>, 'closeLabel' | 'showCloseButton'>) {
  return <DialogFooter data-slot="alert-dialog-footer" {...props} />
}

function AlertDialogTitle({ ...props }: React.ComponentProps<typeof DialogTitle>) {
  return <DialogTitle data-slot="alert-dialog-title" {...props} />
}

function AlertDialogDescription({ ...props }: React.ComponentProps<typeof DialogDescription>) {
  return <DialogDescription data-slot="alert-dialog-description" {...props} />
}

export {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
}
