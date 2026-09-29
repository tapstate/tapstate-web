import { Database } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import type { OverviewSourceItem } from '../overview-model'

interface AddSourcesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Every data source added so far, so the user sees each one land. */
  sources: OverviewSourceItem[]
  /** Opens the new-source form. */
  onConnect: () => void
}

/** The sources step of setup: add databases without leaving Overview, then Done. */
export function AddSourcesDialog({
  open,
  onOpenChange,
  sources,
  onConnect,
}: AddSourcesDialogProps) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('overview.addSources.title')}</DialogTitle>
          <DialogDescription>{t('overview.addSources.description')}</DialogDescription>
        </DialogHeader>
        <div className="overview-add-sources">
          <section className="overview-add-sources__option">
            <Database className="text-muted-foreground h-4 w-4 shrink-0" aria-hidden="true" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h3 className="text-foreground text-[13px] font-semibold">
                {t('overview.addSources.connect.title')}
              </h3>
              <p className="text-muted-foreground text-[12px] leading-relaxed">
                {t('overview.addSources.connect.description')}
              </p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={onConnect}>
              {t('overview.addSources.connect.action')}
            </Button>
          </section>
          {sources.length > 0 && (
            <section aria-labelledby="overview-added-sources">
              <h3
                id="overview-added-sources"
                className="text-muted-foreground mb-2 text-[12px] font-medium"
              >
                {t('overview.addSources.added', { count: sources.length })}
              </h3>
              <ul className="overview-add-sources__list">
                {sources.map((source) => (
                  <li key={source.id}>
                    <span className="text-foreground font-medium">{source.id}</span>
                    <span className="text-muted-foreground">{source.connector}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
        <DialogFooter>
          <Button type="button" size="sm" onClick={() => onOpenChange(false)}>
            {t('overview.addSources.done')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
