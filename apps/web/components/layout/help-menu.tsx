import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@tapstate-web/ui/dropdown-menu'
import { IconButton } from '@tapstate-web/ui/icon-button'
import { useTranslation } from 'react-i18next'

import { isTawkSupportAvailable, openTawkSupport } from '@/features/feedback/tawk-feedback-widget'

export function HelpMenu() {
  const { t } = useTranslation()
  const supportAvailable = isTawkSupportAvailable()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <IconButton
            size="lg"
            aria-label={t('app.help.openMenu')}
            className="border-components-card-border bg-components-card-bg text-text-tertiary hover:bg-components-card-bg-alt hover:text-ui-brand-blue-inverted data-popup-open:bg-components-card-bg-alt data-popup-open:text-ui-brand-blue-inverted size-7 rounded-full border p-0 shadow-xs transition-colors"
          >
            <svg aria-hidden="true" className="size-6 shrink-0" viewBox="0 0 24 24" fill="none">
              <path
                d="M11.9666 16.9985V17.011"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M11.9665 13.2485C11.9665 11.1995 14.4665 11.9134 14.4665 9.49854C14.4665 8.11782 13.3473 6.99854 11.9665 6.99854C11.0412 6.99854 10.2333 7.50129 9.80103 8.24854"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </IconButton>
        }
      />
      <DropdownMenuContent
        placement="top-start"
        sideOffset={8}
        className="w-60 overflow-hidden p-0"
      >
        <DropdownMenuGroup className="p-1">
          <DropdownMenuLinkItem
            href="https://tapstate.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="mx-0 h-8 gap-1 px-3 py-1"
          >
            <span
              aria-hidden="true"
              className="i-ri-book-open-line text-text-tertiary size-4 shrink-0"
            />
            <span className="system-md-regular text-text-secondary min-w-0 grow truncate px-1 py-0.5">
              {t('app.help.documentation')}
            </span>
            <span
              aria-hidden="true"
              className="i-ri-arrow-right-up-line text-text-tertiary size-3.5 shrink-0"
            />
          </DropdownMenuLinkItem>
        </DropdownMenuGroup>
        {supportAvailable && (
          <>
            <DropdownMenuSeparator className="my-0" />
            <DropdownMenuGroup className="p-1">
              <DropdownMenuItem className="mx-0 h-8 gap-1 px-3 py-1" onClick={openTawkSupport}>
                <span
                  aria-hidden="true"
                  className="i-ri-chat-smile-2-line text-text-tertiary size-4 shrink-0"
                />
                <span className="system-md-regular text-text-secondary min-w-0 grow truncate px-1 py-0.5">
                  {t('app.help.contactSupport')}
                </span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
