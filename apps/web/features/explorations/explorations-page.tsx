import type { ComponentType, SVGProps } from 'react'

import {
  ArrowUp,
  AtSign,
  GitMerge,
  History,
  Lightbulb,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  Wrench,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Capability {
  titleKey: string
  bodyKey?: string
  itemKeys: string[]
  icon: ComponentType<SVGProps<SVGSVGElement>>
  iconClass: string
}

const historyItems = [
  { id: 'capabilities', labelKey: 'explorations.history.capabilities', active: true },
  { id: 'trip-trends', labelKey: 'explorations.history.tripTrends', active: false },
  { id: 'tip-zones', labelKey: 'explorations.history.tipZones', active: false },
]

const capabilities: Capability[] = [
  {
    titleKey: 'explorations.capabilities.explore.title',
    itemKeys: [
      'explorations.capabilities.explore.item1',
      'explorations.capabilities.explore.item2',
      'explorations.capabilities.explore.item3',
    ],
    icon: Search,
    iconClass: 'text-blue-500',
  },
  {
    titleKey: 'explorations.capabilities.nodes.title',
    itemKeys: [
      'explorations.capabilities.nodes.item1',
      'explorations.capabilities.nodes.item2',
      'explorations.capabilities.nodes.item3',
    ],
    icon: GitMerge,
    iconClass: 'text-purple-500',
  },
  {
    titleKey: 'explorations.capabilities.resources.title',
    bodyKey: 'explorations.capabilities.resources.body',
    itemKeys: [
      'explorations.capabilities.resources.item1',
      'explorations.capabilities.resources.item2',
    ],
    icon: Wrench,
    iconClass: 'text-gray-500',
  },
  {
    titleKey: 'explorations.capabilities.examples.title',
    bodyKey: 'explorations.capabilities.examples.body',
    itemKeys: [
      'explorations.capabilities.examples.item1',
      'explorations.capabilities.examples.item2',
      'explorations.capabilities.examples.item3',
    ],
    icon: Lightbulb,
    iconClass: 'text-amber-500',
  },
]

export function ExplorationsPage() {
  const { t } = useTranslation()

  return (
    <section className="flex h-full w-full flex-col overflow-hidden bg-white md:flex-row">
      <aside className="flex w-full shrink-0 flex-col border-b border-gray-100/70 bg-[#fcfcfd]/80 md:w-64 md:border-r md:border-b-0">
        <div className="flex items-center justify-between border-b border-gray-100/70 p-3">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold text-gray-900">
            <History className="h-4 w-4 text-gray-500" aria-hidden="true" />
            {t('explorations.title')}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100"
            aria-label={t('explorations.actions.new')}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="min-h-[130px] flex-1 overflow-auto p-2">
          {historyItems.map((item) => (
            <Button
              key={item.id}
              type="button"
              variant="ghost"
              className={cn(
                'group mb-1 h-auto w-full justify-between rounded-md px-3 py-2 text-left',
                item.active ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50',
              )}
            >
              <span className={cn('truncate pr-2 text-[13px]', item.active && 'font-medium')}>
                {t(item.labelKey)}
              </span>
              <MoreHorizontal
                className="h-3.5 w-3.5 shrink-0 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100"
                aria-hidden="true"
              />
            </Button>
          ))}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col bg-white">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-100/80 px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-purple-100">
              <Sparkles className="h-3.5 w-3.5 text-purple-600" aria-hidden="true" />
            </div>
            <h1 className="truncate text-[15px] font-semibold text-gray-900">
              {t('explorations.threadTitle')}
            </h1>
          </div>
        </header>

        <div className="flex flex-1 justify-center overflow-y-auto p-4 md:p-10">
          <div className="flex w-full max-w-3xl flex-col gap-6">
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-gray-100 px-4 py-2.5 text-[14px] text-gray-900">
                {t('explorations.messages.userQuestion')}
              </div>
            </div>

            <div className="flex justify-start">
              <div className="max-w-[88%] space-y-4 text-[14px] leading-relaxed text-gray-900">
                <p>{t('explorations.messages.answerIntro')}</p>
                {capabilities.map((capability) => {
                  const Icon = capability.icon
                  return (
                    <section key={capability.titleKey} className="space-y-1">
                      <h4 className="flex items-center gap-1.5 font-semibold">
                        <Icon className={cn('h-4 w-4', capability.iconClass)} aria-hidden="true" />
                        {t(capability.titleKey)}
                      </h4>
                      {capability.bodyKey && (
                        <p className="text-gray-700">{t(capability.bodyKey)}</p>
                      )}
                      <ul className="list-disc space-y-1 pl-5 text-gray-700">
                        {capability.itemKeys.map((itemKey) => (
                          <li key={itemKey}>{t(itemKey)}</li>
                        ))}
                      </ul>
                    </section>
                  )
                })}
                <p>{t('explorations.messages.answerClose')}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 justify-center p-4 pt-0 md:p-6 md:pt-0">
          <div className="w-full max-w-3xl">
            <div className="relative flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all focus-within:border-gray-400 focus-within:ring-1 focus-within:ring-gray-400">
              <textarea
                rows={1}
                className="max-h-[200px] min-h-[56px] w-full resize-none bg-transparent px-4 py-4 text-[14px] text-gray-900 outline-none placeholder:text-gray-400"
                placeholder={t('explorations.input.placeholder')}
              />
              <div className="flex items-center justify-end bg-white px-2 py-2">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-gray-400 hover:text-gray-600"
                    aria-label={t('explorations.actions.mention')}
                  >
                    <AtSign className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="mr-1 cursor-not-allowed text-gray-400"
                    aria-label={t('explorations.actions.send')}
                    disabled
                  >
                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </section>
  )
}
