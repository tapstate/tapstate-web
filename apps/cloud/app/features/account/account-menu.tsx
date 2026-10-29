import type { ReactNode } from 'react'

import { useNavigate } from '@tanstack/react-router'
import { Avatar, AvatarFallback, AvatarImage } from '@tapstate-web/ui/avatar'
import { cn } from '@tapstate-web/ui/cn'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuRadioItemIndicator,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@tapstate-web/ui/dropdown-menu'
import { useTranslation } from 'react-i18next'

import type { UserProfile } from '../../types'

import { useCloudAppState } from '../../state/cloud-app-state'

interface MenuItemContentProps {
  iconClassName: string
  label: ReactNode
  trailing?: ReactNode
}

function MenuItemContent({ iconClassName, label, trailing }: MenuItemContentProps) {
  const labelTitle = typeof label === 'string' ? label : undefined

  return (
    <>
      <span
        aria-hidden="true"
        className={cn('text-text-tertiary size-4 shrink-0', iconClassName)}
      />
      <span
        className="system-md-regular text-text-secondary min-w-0 grow truncate px-1 py-0.5"
        title={labelTitle}
      >
        {label}
      </span>
      {trailing}
    </>
  )
}

interface MainNavRadioItemContentProps {
  iconClassName?: string
  label: ReactNode
}

function MainNavRadioItemContent({ iconClassName, label }: MainNavRadioItemContentProps) {
  const labelTitle = typeof label === 'string' ? label : undefined

  return (
    <>
      {iconClassName && (
        <span
          aria-hidden="true"
          className={cn('text-text-tertiary size-4 shrink-0', iconClassName)}
        />
      )}
      <span
        className="system-md-regular text-text-secondary min-w-0 grow truncate px-1 py-0.5"
        title={labelTitle}
      >
        {label}
      </span>
      <DropdownMenuRadioItemIndicator />
    </>
  )
}

function AppearanceSubmenu() {
  const { t } = useTranslation()
  const { darkMode, setDarkMode } = useCloudAppState()
  const currentTheme = darkMode ? 'dark' : 'light'

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="mx-0 h-8 gap-1 px-3 py-1">
        <MenuItemContent iconClassName="i-ri-sun-line" label={t('app.account.appearance')} />
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="max-h-90 w-36 p-1">
        <DropdownMenuRadioGroup
          onValueChange={(nextTheme) => setDarkMode(nextTheme === 'dark')}
          value={currentTheme}
        >
          <DropdownMenuRadioItem className="mx-0 h-8 cursor-pointer gap-1 px-3 py-1" value="light">
            <MainNavRadioItemContent
              iconClassName="i-ri-sun-line"
              label={t('app.account.themeLight')}
            />
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem className="mx-0 h-8 cursor-pointer gap-1 px-3 py-1" value="dark">
            <MainNavRadioItemContent
              iconClassName="i-ri-moon-line"
              label={t('app.account.themeDark')}
            />
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}

export interface AccountMenuProps {
  user: UserProfile
  organizationId?: string
  onLogout: () => void | Promise<void>
  compact?: boolean
}

export function AccountMenu({ user, organizationId, onLogout, compact = false }: AccountMenuProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const displayName = user.displayName?.trim() || user.email.split('@')[0]
  const initials = displayName.slice(0, 1).toUpperCase()
  const ariaLabel = t('app.account.openMenu')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            aria-label={compact ? `${displayName} ${ariaLabel}` : ariaLabel}
            className={cn(
              'text-components-main-nav-text hover:bg-state-base-hover data-popup-open:bg-state-base-hover flex min-w-0 shrink items-center rounded-full text-start transition-colors focus-visible:ring-inset disabled:cursor-default disabled:hover:bg-transparent',
              compact ? 'justify-center p-1' : 'max-w-45 gap-3 py-1 ps-1 pe-4',
            )}
            title={displayName}
            type="button"
          >
            <Avatar aria-hidden="true" className="size-7" size="md">
              <AvatarFallback className="bg-[#155eef] text-xs font-medium text-white">
                {initials}
              </AvatarFallback>
              <AvatarImage alt="" src={user.avatarUrl || undefined} />
            </Avatar>
            {!compact && (
              <span
                className="system-md-medium text-text-primary min-w-0 flex-1 truncate"
                title={displayName}
              >
                {displayName}
              </span>
            )}
            <span className="sr-only">{compact ? `${displayName} ${ariaLabel}` : ariaLabel}</span>
          </button>
        }
      />
      <DropdownMenuContent
        className="w-60 max-w-80 overflow-hidden p-0"
        placement="top-start"
        sideOffset={8}
      >
        <DropdownMenuGroup className="p-1">
          <div className="from-background-section-burn to-background-section flex items-center gap-3 rounded-xl bg-gradient-to-b p-3">
            <div className="flex min-w-0 grow flex-col gap-1">
              <div
                className="body-md-medium text-text-primary min-w-0 truncate"
                title={displayName}
              >
                {displayName}
              </div>
              <div className="system-xs-regular text-text-tertiary truncate" title={user.email}>
                {user.email}
              </div>
            </div>
            <Avatar aria-hidden="true" className="size-9 shrink-0" size="lg">
              <AvatarFallback className="bg-[#155eef] text-sm font-medium text-white">
                {initials}
              </AvatarFallback>
              <AvatarImage alt="" src={user.avatarUrl || undefined} />
            </Avatar>
          </div>
        </DropdownMenuGroup>
        <DropdownMenuGroup className="p-1">
          <DropdownMenuItem
            className="mx-0 h-8 cursor-pointer gap-1 px-3 py-1"
            onClick={() => {
              void navigate({
                to: '/settings',
                search: { organizationId: organizationId ?? undefined, tab: 'account' },
              })
            }}
          >
            <MenuItemContent iconClassName="i-ri-user-line" label={t('app.account.profile')} />
          </DropdownMenuItem>
          <AppearanceSubmenu />
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="my-0" />
        <DropdownMenuGroup className="p-1">
          <DropdownMenuItem
            className="mx-0 h-8 cursor-pointer gap-1 px-3 py-1"
            onClick={() => void onLogout()}
          >
            <MenuItemContent iconClassName="i-ri-shut-down-line" label={t('app.account.logOut')} />
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
