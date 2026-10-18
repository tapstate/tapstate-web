import { createToast, createToastManager, Toaster } from '@langgenius/dify-ui/toast'
import * as React from 'react'

export type ToastTone = 'info' | 'success' | 'warning' | 'danger'

export interface ToastOptions {
  id?: string
  tone?: ToastTone
  title: string
  description?: string
  action?: React.ReactNode
  duration?: number
}

export interface ToastPromiseMessages<T> {
  loading: ToastOptions
  success: string | ((value: T) => string)
  error: string | ((error: unknown) => string)
}

export interface ToastApi {
  show: (options: ToastOptions) => string
  update: (id: string, options: Partial<ToastOptions>) => void
  dismiss: (id?: string) => void
  promise: <T>(operation: Promise<T>, messages: ToastPromiseMessages<T>) => Promise<T>
}

const ToastContext = React.createContext<ToastApi | null>(null)

function sourceType(tone?: ToastTone) {
  return tone === 'danger' ? ('error' as const) : (tone ?? 'info')
}

function actionProps(action?: React.ReactNode) {
  if (
    !React.isValidElement<{
      children?: React.ReactNode
      onClick?: React.MouseEventHandler<HTMLButtonElement>
    }>(action)
  )
    return undefined
  return { children: action.props.children, onClick: action.props.onClick }
}

export function ToastProvider({ children }: { children: React.ReactNode; closeLabel: string }) {
  const [manager] = React.useState(createToastManager)
  const sourceToast = React.useMemo(() => createToast(manager), [manager])

  const api = React.useMemo<ToastApi>(
    () => ({
      show(options) {
        return sourceToast(options.title, {
          id: options.id,
          type: sourceType(options.tone),
          description: options.description,
          actionProps: actionProps(options.action),
          timeout: options.duration,
          priority: options.tone === 'danger' ? 'high' : 'low',
        })
      },
      update(id, options) {
        sourceToast.update(id, {
          title: options.title,
          type: options.tone ? sourceType(options.tone) : undefined,
          description: options.description,
          actionProps: actionProps(options.action),
          timeout: options.duration,
          priority: options.tone === 'danger' ? 'high' : undefined,
        })
      },
      dismiss: sourceToast.dismiss,
      promise<T>(operation: Promise<T>, messages: ToastPromiseMessages<T>) {
        return sourceToast.promise(operation, {
          loading: { title: messages.loading.title, timeout: 0 },
          success: messages.success,
          error: messages.error,
        })
      },
    }),
    [sourceToast],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Toaster toastManager={manager} limit={5} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const value = React.useContext(ToastContext)
  if (!value) throw new Error('useToast must be used within ToastProvider.')
  return value
}
