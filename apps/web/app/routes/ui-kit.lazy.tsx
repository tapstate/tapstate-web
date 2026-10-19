import { createForm } from '@formily/core'
import { Field as FormilyField, FormProvider } from '@formily/react'
import SourceAlert from '@langgenius/dify-ui/alert'
import {
  AlertDialog as SourceAlertDialog,
  AlertDialogCancelButton as SourceAlertDialogCancelButton,
  AlertDialogConfirmButton as SourceAlertDialogConfirmButton,
  AlertDialogContent as SourceAlertDialogContent,
  AlertDialogDescription as SourceAlertDialogDescription,
  AlertDialogFooter as SourceAlertDialogFooter,
  AlertDialogHeader as SourceAlertDialogHeader,
  AlertDialogTitle as SourceAlertDialogTitle,
  AlertDialogTrigger as SourceAlertDialogTrigger,
} from '@langgenius/dify-ui/alert-dialog'
import SourceBadge from '@langgenius/dify-ui/badge'
import { Button as SourceButton } from '@langgenius/dify-ui/button'
import {
  Drawer as SourceDrawer,
  DrawerBackdrop as SourceDrawerBackdrop,
  DrawerClose as SourceDrawerClose,
  DrawerContent as SourceDrawerContent,
  DrawerDescription as SourceDrawerDescription,
  DrawerPopup as SourceDrawerPopup,
  DrawerPortal as SourceDrawerPortal,
  DrawerTitle as SourceDrawerTitle,
  DrawerTrigger as SourceDrawerTrigger,
  DrawerViewport as SourceDrawerViewport,
} from '@langgenius/dify-ui/drawer'
import FilterEmptyState from '@langgenius/dify-ui/filter-empty-state'
import { Input as SourceInput } from '@langgenius/dify-ui/input'
import SourceRadioCard from '@langgenius/dify-ui/radio-card'
import { RadioGroup as SourceRadioGroup } from '@langgenius/dify-ui/radio-group'
import { SearchInput as SourceSearchInput } from '@langgenius/dify-ui/search-input'
import { StatusDot } from '@langgenius/dify-ui/status-dot'
import { createLazyFileRoute } from '@tanstack/react-router'
import {
  Button,
  Checkbox,
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Field,
  IconButton,
  Input,
  InputAddon,
  InputGroup,
  InputGroupInput,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Switch,
  Textarea,
  ToastProvider,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useToast,
} from '@tapstate-web/ui'
import { Plus, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  FormilyFieldDecorator,
  FormilyInput,
  FormilySelect,
} from '@/components/formily/formily-ui-adapters'

export const Route = createLazyFileRoute('/ui-kit')({
  component: UiKitPage,
})

function UiKitPage() {
  const { t } = useTranslation()
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light'
    return () => {
      document.documentElement.dataset.theme = 'light'
    }
  }, [darkMode])

  return (
    <div className={darkMode ? 'dark' : ''}>
      <ToastProvider closeLabel={t('common.close')}>
        <UiKitPageContent darkMode={darkMode} onDarkModeChange={setDarkMode} />
      </ToastProvider>
    </div>
  )
}

function UiKitPageContent({
  darkMode,
  onDarkModeChange,
}: {
  darkMode: boolean
  onDarkModeChange: (darkMode: boolean) => void
}) {
  const { t, i18n } = useTranslation()
  const toast = useToast()
  const [includeArchived, setIncludeArchived] = useState(true)
  const [liveRefresh, setLiveRefresh] = useState(false)
  const [radioValue, setRadioValue] = useState('north-america')
  const [sourceSearch, setSourceSearch] = useState('')
  const [notes, setNotes] = useState('')
  const [region, setRegion] = useState<string | null>(null)
  const [dialogRegion, setDialogRegion] = useState('us-east')
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const [alertVisible, setAlertVisible] = useState(true)
  const locale = i18n.resolvedLanguage?.startsWith('zh-TW')
    ? 'zh-TW'
    : i18n.resolvedLanguage?.startsWith('zh')
      ? 'zh-CN'
      : 'en'
  const variants = ['primary', 'secondary', 'tertiary', 'ghost', 'destructive'] as const
  const variantLabels = {
    primary: t('uiKit.buttons.variantPrimary'),
    secondary: t('uiKit.buttons.variantSecondary'),
    tertiary: t('uiKit.buttons.variantTertiary'),
    ghost: t('uiKit.buttons.variantGhost'),
    destructive: t('uiKit.buttons.variantDestructive'),
  }

  const runPromise = (shouldReject: boolean) => {
    const operation = new Promise<string>((resolve, reject) => {
      window.setTimeout(() => {
        if (shouldReject) reject(new Error('fixture failure'))
        else resolve('fixture success')
      }, 1200)
    })

    void toast
      .promise(operation, {
        loading: { title: t('uiKit.feedback.promisePending') },
        success: t('uiKit.feedback.promiseSuccess'),
        error: t('uiKit.feedback.promiseFailure'),
      })
      .catch(() => undefined)
  }

  return (
    <div className="bg-ui-bg-canvas text-ui-text-primary min-h-screen">
      <section
        className="bg-background-body text-text-primary px-6 py-5"
        aria-label="Source components"
      >
        <h2 className="system-md-semibold mb-3">Source components</h2>
        <div className="flex flex-wrap items-center gap-2">
          <SourceButton variant="primary" size="small">
            Primary small
          </SourceButton>
          <SourceButton variant="primary" size="medium">
            Primary medium
          </SourceButton>
          <SourceButton variant="primary" size="large">
            Primary large
          </SourceButton>
          <SourceButton variant="secondary" size="medium">
            Secondary
          </SourceButton>
          <SourceButton variant="tertiary" size="medium">
            Tertiary
          </SourceButton>
          <SourceButton variant="ghost" size="medium">
            Ghost
          </SourceButton>
          <SourceButton variant="primary" tone="destructive" size="medium">
            Destructive
          </SourceButton>
          <SourceButton variant="primary" size="medium" disabled>
            Disabled
          </SourceButton>
          <SourceButton variant="primary" size="medium" loading>
            Loading
          </SourceButton>
          <SourceInput aria-label="Sample input" placeholder="Sample input" className="w-48" />
          <SourceSearchInput
            value={sourceSearch}
            onValueChange={setSourceSearch}
            aria-label={t('sources.search.label')}
            clearLabel={t('sources.search.clear')}
            placeholder={t('sources.search.placeholder')}
            className="w-52"
          />
        </div>
      </section>
      <header className="border-ui-border-default bg-ui-bg-surface border-b">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{t('uiKit.title')}</h1>
            <p className="text-ui-text-tertiary mt-1 text-sm">{t('uiKit.subtitle')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="text-ui-text-secondary flex items-center gap-2 text-sm">
              <span>{t('uiKit.language')}</span>
              <Select
                value={locale}
                onValueChange={(value) => void i18n.changeLanguage(String(value))}
              >
                <SelectTrigger className="w-36" aria-label={t('uiKit.language')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t('app.languageOptions.en')}</SelectItem>
                  <SelectItem value="zh-CN">{t('app.languageOptions.zh-CN')}</SelectItem>
                  <SelectItem value="zh-TW">{t('app.languageOptions.zh-TW')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-ui-text-secondary flex items-center gap-2 text-sm">
              <Switch
                aria-label={t('uiKit.darkMode')}
                checked={darkMode}
                onCheckedChange={onDarkModeChange}
              />
              <span>{t('uiKit.darkMode')}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl min-w-0 grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-2">
        <section aria-labelledby="ui-kit-buttons" className="min-w-0 space-y-3">
          <h2 className="text-sm font-semibold" id="ui-kit-buttons">
            {t('uiKit.sections.buttons')}
          </h2>
          <section className="border-components-panel-border bg-components-panel-bg space-y-4 rounded-xl border p-4">
            <div className="flex flex-wrap items-center gap-2">
              {variants.map((variant) => (
                <Button key={variant} variant={variant}>
                  {variantLabels[variant]}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="small" variant="secondary">
                {t('uiKit.buttons.sizeSmall')}
              </Button>
              <Button size="medium" variant="secondary">
                {t('uiKit.buttons.sizeMedium')}
              </Button>
              <Button size="large" variant="secondary">
                {t('uiKit.buttons.sizeLarge')}
              </Button>
              <Button loading variant="secondary">
                {t('uiKit.buttons.loading')}
              </Button>
              <Button disabled variant="secondary">
                {t('uiKit.buttons.disabled')}
              </Button>
              <IconButton aria-label={t('uiKit.buttons.iconLabel')} variant="secondary">
                <Plus aria-hidden="true" size={16} />
              </IconButton>
            </div>
          </section>
        </section>

        <section aria-labelledby="ui-kit-fields" className="min-w-0 space-y-3">
          <h2 className="text-sm font-semibold" id="ui-kit-fields">
            {t('uiKit.sections.fields')}
          </h2>
          <section className="border-components-panel-border bg-components-panel-bg grid gap-4 rounded-xl border p-4 sm:grid-cols-2">
            <Field
              id="ui-kit-email"
              label={t('uiKit.fields.email')}
              description={t('uiKit.fields.description')}
              required
            >
              <Input placeholder={t('uiKit.fields.emailPlaceholder')} type="email" />
            </Field>
            <Field
              id="ui-kit-workspace"
              label={t('uiKit.fields.invalid')}
              error={t('uiKit.fields.invalidError')}
            >
              <Input aria-invalid value={t('uiKit.fields.invalidValue')} readOnly />
            </Field>
            <Field id="ui-kit-password" label={t('uiKit.fields.password')} required>
              <Input placeholder={t('uiKit.fields.passwordPlaceholder')} type="password" />
            </Field>
            <Field id="ui-kit-disabled" label={t('uiKit.fields.disabled')}>
              <Input disabled value={t('uiKit.fields.disabledValue')} readOnly />
            </Field>
            <Field id="ui-kit-search" label={t('uiKit.fields.search')}>
              <InputGroup>
                <InputAddon aria-hidden="true">
                  <Search size={14} />
                </InputAddon>
                <InputGroupInput placeholder={t('uiKit.fields.searchPlaceholder')} type="search" />
              </InputGroup>
            </Field>
            <Field className="sm:col-span-2" id="ui-kit-notes" label={t('uiKit.fields.notes')}>
              <Textarea
                className="min-h-20"
                value={notes}
                onValueChange={setNotes}
                placeholder={t('uiKit.fields.notesPlaceholder')}
                rows={3}
              />
            </Field>
            <div className="border-ui-border-subtle space-y-3 border-t pt-4 sm:col-span-2">
              <div>
                <h3 className="text-sm font-semibold">{t('uiKit.schema.title')}</h3>
                <p className="text-ui-text-tertiary mt-1 text-sm">
                  {t('uiKit.schema.description')}
                </p>
              </div>
              <UiKitFormilyFixture key={i18n.resolvedLanguage} />
            </div>
          </section>
        </section>

        <section aria-labelledby="ui-kit-selection" className="min-w-0 space-y-3">
          <h2 className="text-sm font-semibold" id="ui-kit-selection">
            {t('uiKit.sections.selection')}
          </h2>
          <section className="border-components-panel-border bg-components-panel-bg space-y-4 rounded-xl border p-4">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2 text-sm">
                <Checkbox
                  aria-label={t('uiKit.selection.checkbox')}
                  checked={includeArchived}
                  onCheckedChange={(checked) => setIncludeArchived(checked === true)}
                />
                <span>{t('uiKit.selection.checkbox')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Switch
                  aria-label={t('uiKit.selection.switch')}
                  checked={liveRefresh}
                  onCheckedChange={setLiveRefresh}
                />
                <span>{t('uiKit.selection.switch')}</span>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="ui-field">
                <span className="ui-field-label">{t('uiKit.selection.radio')}</span>
                <SourceRadioGroup
                  aria-label={t('uiKit.selection.radio')}
                  onValueChange={(value) => setRadioValue(String(value))}
                  value={radioValue}
                  className="flex-col items-stretch"
                >
                  <SourceRadioCard
                    value="north-america"
                    icon={
                      <span
                        className="i-ri-global-line text-text-accent size-4"
                        aria-hidden="true"
                      />
                    }
                    title={t('uiKit.selection.northAmerica')}
                    description={t('uiKit.selection.radioDescription')}
                  />
                  <SourceRadioCard
                    value="asia-pacific"
                    icon={
                      <span
                        className="i-ri-global-line text-text-accent size-4"
                        aria-hidden="true"
                      />
                    }
                    title={t('uiKit.selection.asiaPacific')}
                    description={t('uiKit.selection.radioDescription')}
                  />
                </SourceRadioGroup>
              </div>
              <Field id="ui-kit-select" label={t('uiKit.selection.selectOption')}>
                <Select value={region} onValueChange={(value) => setRegion(String(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('uiKit.selection.selectOption')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="us-east">{t('uiKit.selection.regionOne')}</SelectItem>
                    <SelectItem value="eu-west">{t('uiKit.selection.regionTwo')}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="system-xs-regular text-text-secondary inline-flex items-center gap-1.5">
                <StatusDot className="rounded-full" status="success" />
                {t('uiKit.selection.selected')}
              </span>
              <span className="system-xs-regular text-text-tertiary inline-flex items-center gap-1.5">
                <StatusDot className="rounded-full" status="disabled" />
                {t('uiKit.selection.notSelected')}
              </span>
            </div>
          </section>
        </section>

        <section aria-labelledby="ui-kit-feedback" className="min-w-0 space-y-3">
          <h2 className="text-sm font-semibold" id="ui-kit-feedback">
            {t('uiKit.sections.feedback')}
          </h2>
          <section className="border-components-panel-border bg-components-panel-bg space-y-4 rounded-xl border p-4">
            <div className="flex flex-wrap gap-2">
              <SourceBadge>{t('uiKit.feedback.badgeDefault')}</SourceBadge>
              <SourceBadge variant="dimm">{t('uiKit.feedback.badgeDimmed')}</SourceBadge>
              <SourceBadge size="xs" hasRedCornerMark>
                {t('uiKit.feedback.badgeCornerMark')}
              </SourceBadge>
            </div>
            <div className="space-y-2">
              <h3 className="system-sm-semibold text-text-primary">Alert</h3>
              {alertVisible ? (
                <SourceAlert
                  message={`${t('uiKit.feedback.alertTitle')} — ${t('uiKit.feedback.alertDescription')}`}
                  closeLabel={t('common.close')}
                  onHide={() => setAlertVisible(false)}
                />
              ) : (
                <SourceButton variant="secondary" onClick={() => setAlertVisible(true)}>
                  Alert
                </SourceButton>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() =>
                  toast.show({
                    tone: 'info',
                    title: t('uiKit.feedback.toastInfo'),
                    description: t('uiKit.feedback.toastDescription'),
                  })
                }
                variant="secondary"
              >
                {t('uiKit.feedback.infoAction')}
              </Button>
              <Button
                onClick={() =>
                  toast.show({ tone: 'success', title: t('uiKit.feedback.toastSuccess') })
                }
                variant="secondary"
              >
                {t('uiKit.feedback.successAction')}
              </Button>
              <Button
                onClick={() =>
                  toast.show({ tone: 'warning', title: t('uiKit.feedback.toastWarning') })
                }
                variant="secondary"
              >
                {t('uiKit.feedback.warningAction')}
              </Button>
              <Button
                onClick={() =>
                  toast.show({ tone: 'danger', title: t('uiKit.feedback.toastDanger') })
                }
                variant="secondary"
              >
                {t('uiKit.feedback.errorAction')}
              </Button>
              <Button
                onClick={() =>
                  toast.show({
                    title: t('uiKit.feedback.toastInfo'),
                    action: (
                      <Button
                        onClick={() =>
                          toast.show({
                            tone: 'success',
                            title: t('uiKit.feedback.toastActionDone'),
                          })
                        }
                        size="small"
                        variant="tertiary"
                      >
                        {t('uiKit.feedback.toastAction')}
                      </Button>
                    ),
                  })
                }
                variant="secondary"
              >
                {t('uiKit.feedback.actionToast')}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() =>
                  toast.show({
                    id: 'ui-kit-persistent',
                    duration: 0,
                    title: t('uiKit.feedback.toastPersistent'),
                  })
                }
                variant="secondary"
              >
                {t('uiKit.feedback.toastUpdate')}
              </Button>
              <Button
                onClick={() =>
                  toast.update('ui-kit-persistent', {
                    title: t('uiKit.feedback.toastUpdated'),
                    tone: 'success',
                    duration: 0,
                  })
                }
                variant="secondary"
              >
                {t('uiKit.feedback.toastUpdateAction')}
              </Button>
              <Button onClick={() => runPromise(false)} variant="secondary">
                {t('uiKit.feedback.promise')}
              </Button>
              <Button onClick={() => runPromise(true)} variant="secondary">
                {t('uiKit.feedback.promiseError')}
              </Button>
            </div>
          </section>
        </section>

        <section aria-labelledby="ui-kit-surfaces" className="min-w-0 space-y-3">
          <h2 className="text-sm font-semibold" id="ui-kit-surfaces">
            {t('uiKit.sections.surfaces')}
          </h2>
          <div className="space-y-4">
            <section className="border-components-panel-border bg-components-panel-bg space-y-1 rounded-xl border p-3">
              <h3 className="text-sm font-semibold">{t('uiKit.surfaces.panelTitle')}</h3>
              <p className="text-ui-text-tertiary text-sm">
                {t('uiKit.surfaces.panelDescription')}
              </p>
            </section>
            <div className="grid gap-4 sm:grid-cols-2">
              <section className="border-components-panel-border bg-components-panel-bg relative min-h-60 overflow-hidden rounded-xl border p-0">
                <FilterEmptyState title={t('uiKit.surfaces.emptyTitle')} className="px-2" />
              </section>
              <section
                className="border-components-panel-border bg-components-panel-bg space-y-2 rounded-xl border p-4"
                role="status"
                aria-label={t('uiKit.surfaces.skeleton')}
              >
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </section>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold">{t('uiKit.surfaces.tableTitle')}</h3>
              <div className="max-w-full overflow-auto">
                <table className="text-text-secondary w-full max-w-full min-w-130 border-collapse border-0 text-sm [&_td]:px-3 [&_td]:py-1.25 [&_th]:px-3">
                  <thead className="border-divider-subtle text-text-tertiary h-8 border-b text-xs/8 font-medium uppercase [&>tr>th]:text-left [&>tr>th]:font-[weight:inherit]">
                    <tr className="border-divider-subtle hover:bg-background-default-hover h-8 border-b">
                      <th>{t('uiKit.surfaces.name')}</th>
                      <th>{t('uiKit.surfaces.status')}</th>
                      <th>{t('uiKit.surfaces.updated')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-divider-subtle hover:bg-background-default-hover h-8 border-b">
                      <td>{t('uiKit.surfaces.recordOne')}</td>
                      <td>
                        <span className="system-xs-regular text-text-secondary inline-flex items-center gap-1.5">
                          <StatusDot className="rounded-full" status="success" />
                          {t('uiKit.surfaces.ready')}
                        </span>
                      </td>
                      <td>{t('uiKit.surfaces.timeOne')}</td>
                    </tr>
                    <tr className="border-divider-subtle hover:bg-background-default-hover h-8 border-b">
                      <td>{t('uiKit.surfaces.recordTwo')}</td>
                      <td>
                        <span className="system-xs-regular text-text-secondary inline-flex items-center gap-1.5">
                          <StatusDot className="rounded-full" status="warning" />
                          {t('uiKit.surfaces.inProgress')}
                        </span>
                      </td>
                      <td>{t('uiKit.surfaces.timeTwo')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="ui-kit-overlays" className="min-w-0 space-y-3 lg:col-span-2">
          <h2 className="text-sm font-semibold" id="ui-kit-overlays">
            {t('uiKit.sections.overlays')}
          </h2>
          <section className="border-components-panel-border bg-components-panel-bg flex flex-wrap items-center gap-2 rounded-xl border p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary">{t('uiKit.overlays.menuTrigger')}</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>{t('uiKit.overlays.menuItem')}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive">
                  {t('uiKit.overlays.menuDanger')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="secondary">{t('uiKit.overlays.popoverTrigger')}</Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-4">
                <h3 className="text-sm font-semibold">{t('uiKit.overlays.popoverTitle')}</h3>
                <p className="text-ui-text-tertiary mt-1 text-sm">
                  {t('uiKit.overlays.popoverDescription')}
                </p>
              </PopoverContent>
            </Popover>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="secondary">{t('uiKit.overlays.tooltipTrigger')}</Button>
                </TooltipTrigger>
                <TooltipContent>{t('uiKit.overlays.tooltipText')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary">{t('uiKit.overlays.dialogTrigger')}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('uiKit.overlays.dialogTitle')}</DialogTitle>
                  <DialogDescription>{t('uiKit.overlays.dialogDescription')}</DialogDescription>
                </DialogHeader>
                <DialogBody className="space-y-3">
                  <Field label={t('uiKit.schema.region')}>
                    <Select
                      value={dialogRegion}
                      onValueChange={(value) => setDialogRegion(String(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="us-east">{t('uiKit.selection.regionOne')}</SelectItem>
                        <SelectItem value="eu-west">{t('uiKit.selection.regionTwo')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  {Array.from({ length: 18 }, (_, index) => (
                    <p key={index}>{t('uiKit.overlays.dialogBody')}</p>
                  ))}
                </DialogBody>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="secondary">{t('uiKit.overlays.close')}</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button>{t('common.save')}</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <SourceAlertDialog open={confirmationOpen} onOpenChange={setConfirmationOpen}>
              <SourceAlertDialogTrigger render={<SourceButton tone="destructive" />}>
                {t('uiKit.overlays.alertDialogTrigger')}
              </SourceAlertDialogTrigger>
              <SourceAlertDialogContent>
                <SourceAlertDialogHeader>
                  <SourceAlertDialogTitle>
                    {t('uiKit.overlays.alertDialogTitle')}
                  </SourceAlertDialogTitle>
                  <SourceAlertDialogDescription>
                    {t('uiKit.overlays.alertDialogDescription')}
                  </SourceAlertDialogDescription>
                </SourceAlertDialogHeader>
                <SourceAlertDialogFooter>
                  <SourceAlertDialogCancelButton variant="secondary">
                    {t('uiKit.overlays.cancel')}
                  </SourceAlertDialogCancelButton>
                  <SourceAlertDialogConfirmButton onClick={() => setConfirmationOpen(false)}>
                    {t('uiKit.overlays.confirm')}
                  </SourceAlertDialogConfirmButton>
                </SourceAlertDialogFooter>
              </SourceAlertDialogContent>
            </SourceAlertDialog>

            <SourceDrawer swipeDirection="right">
              <SourceDrawerTrigger render={<SourceButton variant="secondary" />}>
                {t('uiKit.overlays.drawerTrigger')}
              </SourceDrawerTrigger>
              <SourceDrawerPortal>
                <SourceDrawerBackdrop className="fixed" />
                <SourceDrawerViewport>
                  <SourceDrawerPopup>
                    <div className="flex shrink-0 items-start justify-between gap-2 px-6 pt-6">
                      <div>
                        <SourceDrawerTitle className="system-md-semibold text-text-primary">
                          {t('uiKit.overlays.drawerTitle')}
                        </SourceDrawerTitle>
                        <SourceDrawerDescription className="system-sm-regular text-text-tertiary">
                          {t('uiKit.overlays.drawerDescription')}
                        </SourceDrawerDescription>
                      </div>
                      <SourceDrawerClose
                        render={
                          <SourceButton
                            variant="ghost"
                            size="small"
                            aria-label={t('common.close')}
                          />
                        }
                      >
                        <X className="size-4" aria-hidden="true" />
                      </SourceDrawerClose>
                    </div>
                    <SourceDrawerContent className="space-y-3">
                      {Array.from({ length: 24 }, (_, index) => (
                        <p key={index}>{t('uiKit.overlays.drawerBody')}</p>
                      ))}
                    </SourceDrawerContent>
                    <div className="flex shrink-0 justify-end px-6 pb-6">
                      <SourceDrawerClose render={<SourceButton variant="secondary" />}>
                        {t('uiKit.overlays.close')}
                      </SourceDrawerClose>
                    </div>
                  </SourceDrawerPopup>
                </SourceDrawerViewport>
              </SourceDrawerPortal>
            </SourceDrawer>
          </section>
        </section>
      </main>
    </div>
  )
}

function UiKitFormilyFixture() {
  const { t } = useTranslation()
  const form = useMemo(
    () => createForm({ initialValues: { workspace: 'Meridian Logistics', region: 'us-east' } }),
    [],
  )
  const [submitting, setSubmitting] = useState(false)

  const validateFields = () => void form.validate(['workspace', 'region'])
  const loadRegions = () => {
    form.setFieldState('region', (field) => {
      field.loading = true
    })
    window.setTimeout(() => {
      form.setFieldState('region', (field) => {
        field.loading = false
        field.dataSource = [
          { label: t('uiKit.selection.regionOne'), value: 'us-east' },
          { label: t('uiKit.selection.asiaPacific'), value: 'ap-southeast' },
        ]
      })
    }, 1200)
  }
  const simulateSubmitFailure = async () => {
    setSubmitting(true)
    try {
      await form.submit(async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 800))
        throw new Error('fixture failure')
      })
    } catch {
      form.setFieldState('workspace', (field) => {
        field.selfErrors = [t('uiKit.schema.submitFailure')]
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FormProvider form={form}>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormilyField
          name="workspace"
          required
          validator={(value) =>
            typeof value === 'string' && value.trim().length > 0
              ? ''
              : t('uiKit.schema.requiredError')
          }
          decorator={[
            FormilyFieldDecorator,
            {
              label: t('uiKit.schema.workspace'),
              description: t('uiKit.schema.workspaceDescription'),
            },
          ]}
          component={[FormilyInput, { placeholder: t('uiKit.schema.workspacePlaceholder') }]}
        />
        <FormilyField
          name="region"
          required
          title={t('uiKit.schema.region')}
          dataSource={[
            { label: t('uiKit.selection.regionOne'), value: 'us-east' },
            { label: t('uiKit.selection.regionTwo'), value: 'eu-west' },
          ]}
          decorator={[FormilyFieldDecorator]}
          component={[
            FormilySelect,
            {
              placeholder: t('uiKit.schema.regionPlaceholder'),
            },
          ]}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={validateFields} variant="secondary">
          {t('uiKit.schema.validate')}
        </Button>
        <Button onClick={loadRegions} variant="secondary">
          {t('uiKit.schema.loadRegions')}
        </Button>
        <Button
          loading={submitting}
          onClick={() => void simulateSubmitFailure()}
          variant="secondary"
        >
          {t('uiKit.schema.submitFailureAction')}
        </Button>
      </div>
    </FormProvider>
  )
}
