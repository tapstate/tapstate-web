import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

export function Table({ className, ...props }: ComponentProps<'table'>) {
  return (
    <table className={cn('w-full text-left text-[13px]', className)} data-slot="table" {...props} />
  )
}

export function TableHeader({ className, ...props }: ComponentProps<'thead'>) {
  return (
    <thead
      className={cn('border-b border-gray-200/70 bg-gray-50/70 text-gray-500', className)}
      data-slot="table-header"
      {...props}
    />
  )
}

export function TableBody({ className, ...props }: ComponentProps<'tbody'>) {
  return (
    <tbody
      className={cn('divide-y divide-gray-100/70', className)}
      data-slot="table-body"
      {...props}
    />
  )
}

export function TableRow({ className, ...props }: ComponentProps<'tr'>) {
  return (
    <tr
      className={cn('transition-colors hover:bg-gray-50/70', className)}
      data-slot="table-row"
      {...props}
    />
  )
}

export function TableHead({ className, ...props }: ComponentProps<'th'>) {
  return <th className={cn('px-4 py-3 font-medium', className)} data-slot="table-head" {...props} />
}

export function TableCell({ className, ...props }: ComponentProps<'td'>) {
  return <td className={cn('px-4 py-3', className)} data-slot="table-cell" {...props} />
}
