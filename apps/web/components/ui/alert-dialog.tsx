import type * as React from 'react'

import {
  AlertDialog as SourceAlertDialog,
  AlertDialogBody as SourceAlertDialogBody,
  AlertDialogContent as SourceAlertDialogContent,
  AlertDialogDescription as SourceAlertDialogDescription,
  AlertDialogFooter as SourceAlertDialogFooter,
  AlertDialogHeader as SourceAlertDialogHeader,
  AlertDialogTitle as SourceAlertDialogTitle,
} from '@tapstate-web/ui/alert-dialog'

/**
 * A dialog that interrupts an action and asks for an explicit answer. It shares the Dialog surface,
 * but it is always modal, outside presses do not dismiss it, and it never renders a close icon:
 * the footer's explicit buttons are the only way to answer.
 */
function AlertDialog(props: React.ComponentProps<typeof SourceAlertDialog>) {
  return <SourceAlertDialog data-slot="alert-dialog" {...props} />
}

function AlertDialogContent(props: React.ComponentProps<typeof SourceAlertDialogContent>) {
  return <SourceAlertDialogContent data-slot="alert-dialog-content" {...props} />
}

function AlertDialogBody(props: React.ComponentProps<typeof SourceAlertDialogBody>) {
  return <SourceAlertDialogBody data-slot="alert-dialog-body" {...props} />
}

function AlertDialogHeader(props: React.ComponentProps<typeof SourceAlertDialogHeader>) {
  return <SourceAlertDialogHeader data-slot="alert-dialog-header" {...props} />
}

function AlertDialogFooter(props: React.ComponentProps<typeof SourceAlertDialogFooter>) {
  return <SourceAlertDialogFooter data-slot="alert-dialog-footer" {...props} />
}

function AlertDialogTitle(props: React.ComponentProps<typeof SourceAlertDialogTitle>) {
  return <SourceAlertDialogTitle data-slot="alert-dialog-title" {...props} />
}

function AlertDialogDescription(props: React.ComponentProps<typeof SourceAlertDialogDescription>) {
  return <SourceAlertDialogDescription data-slot="alert-dialog-description" {...props} />
}

export {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
}
