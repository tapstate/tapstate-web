import { Button as SourceButton, buttonVariants } from '@langgenius/dify-ui/button'
import { cn } from '@langgenius/dify-ui/cn'
import { IconButton as SourceIconButton } from '@langgenius/dify-ui/icon-button'
import * as React from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'destructive'
export type ButtonSize = 'small' | 'medium' | 'large' | 'icon' | 'icon-small' | 'icon-large'

type LegacyButtonVariant = 'default' | 'outline' | 'link'
type LegacyButtonSize = 'xs' | 'sm' | 'default' | 'lg' | 'icon-xs' | 'icon-sm' | 'icon-lg'
export type ButtonTone = 'default' | 'destructive'

export type ButtonProps = React.ComponentProps<'button'> & {
  variant?: ButtonVariant | LegacyButtonVariant
  tone?: ButtonTone
  size?: ButtonSize | LegacyButtonSize
  asChild?: boolean
  loading?: boolean
  nativeButton?: boolean
}

function appearance(variant: ButtonProps['variant'], tone: ButtonTone) {
  if (variant === 'destructive')
    return { variant: 'primary' as const, tone: 'destructive' as const }
  if (variant === 'outline') return { variant: 'secondary' as const, tone }
  if (variant === 'link') return { variant: 'ghost' as const, tone }
  if (variant === 'default' || variant === undefined) return { variant: 'primary' as const, tone }
  return { variant, tone }
}

function buttonSize(size: ButtonProps['size']) {
  if (size === 'small' || size === 'xs' || size === 'sm') return 'small' as const
  if (size === 'large' || size === 'lg') return 'large' as const
  return 'medium' as const
}

function iconSize(size: ButtonProps['size']) {
  if (size === 'icon-xs') return 'xs' as const
  if (size === 'icon-small' || size === 'icon-sm') return 'sm' as const
  if (size === 'icon-large' || size === 'icon-lg') return 'lg' as const
  return 'md' as const
}

function isIconSize(size: ButtonProps['size']) {
  return size?.startsWith('icon') ?? false
}

export function Button({
  asChild = false,
  className,
  children,
  type = 'button',
  variant,
  tone = 'default',
  size,
  loading = false,
  disabled,
  nativeButton: _nativeButton,
  ...props
}: ButtonProps) {
  const style = appearance(variant, tone)
  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ className?: string }>
    return React.cloneElement(child, {
      ...props,
      className: cn(
        buttonVariants({ ...style, size: buttonSize(size) }),
        className,
        child.props.className,
      ),
    })
  }
  if (isIconSize(size)) {
    const icon = React.isValidElement(children) ? children : <span>{children}</span>
    const { 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledBy, ...actionProps } = props
    const iconProps = {
      type,
      variant: style.variant,
      tone: style.tone,
      size: iconSize(size),
      className,
      disabled: disabled || loading,
      ...actionProps,
    }
    if (ariaLabel) {
      return (
        <SourceIconButton {...iconProps} aria-label={ariaLabel}>
          {icon}
        </SourceIconButton>
      )
    }
    if (ariaLabelledBy) {
      return (
        <SourceIconButton {...iconProps} aria-labelledby={ariaLabelledBy}>
          {icon}
        </SourceIconButton>
      )
    }
    return (
      <SourceButton
        type={type}
        variant={style.variant}
        tone={style.tone}
        size="small"
        className={cn('size-6 p-0', className)}
        disabled={disabled || loading}
        {...props}
      >
        {icon}
      </SourceButton>
    )
  }
  return (
    <SourceButton
      type={type}
      variant={style.variant}
      tone={style.tone}
      size={buttonSize(size)}
      className={className}
      loading={loading}
      disabled={disabled}
      {...props}
    >
      {children}
    </SourceButton>
  )
}

export function IconButton(props: ButtonProps & { 'aria-label': string }) {
  const { size = 'icon', ...rest } = props
  return <Button {...rest} size={size} />
}
