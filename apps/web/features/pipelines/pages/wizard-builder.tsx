import {
  Braces,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CornerUpLeft,
  Database,
  Edit2,
  LayoutGrid,
  MessageSquare,
  Plus,
  Settings2,
  Table,
  Zap,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

const fields = [
  '_id',
  'CITY',
  'COUNTRY_CODE',
  'CUSTOMER_ID',
  'DATE_OF_BIRTH',
  'DIRECT',
  'EMAIL',
  'FIRST_NAME',
  'GENDER',
  'JOB',
]

export function WizardBuilder({
  onBack,
  pipelineId,
  description,
}: {
  onBack: () => void
  pipelineId?: string
  description?: string
}) {
  const { t } = useTranslation()

  return (
    <section className="flex h-full w-full flex-col bg-[#fafafa]">
      <header className="flex h-14 shrink-0 items-center border-b border-gray-200/70 bg-white px-4">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="mr-2 text-gray-500 hover:text-gray-900"
          aria-label={t('common.back')}
          onClick={onBack}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate text-[14px] font-semibold text-gray-900">
            {pipelineId || t('wizard.title')}
          </h1>
          <Edit2 className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden="true" />
        </div>
        {description && (
          <span className="ml-auto hidden max-w-[18rem] truncate text-[12px] text-gray-500 md:block">
            {description}
          </span>
        )}
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 lg:flex-row">
        <main className="flex min-h-[460px] flex-1 flex-col items-center overflow-y-auto pr-0 pb-20 lg:pr-2">
          <article className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[14px] font-semibold text-gray-900">
                <Table className="h-4 w-4 text-gray-500" aria-hidden="true" />
                {t('wizard.sourceData')}
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-auto w-full justify-between p-2 text-[13px] hover:border-gray-300"
            >
              <span className="flex flex-1 items-center gap-2 text-gray-700">
                <Database className="h-3.5 w-3.5 text-blue-400" aria-hidden="true" />
                {t('wizard.sourceName')}
              </span>
              <span className="flex items-center gap-1.5 border-l border-gray-200 pl-3 text-gray-600">
                {t('wizard.pickFields')}
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </Button>
          </article>

          <ConnectorButton label={t('wizard.addStep')} tone="purple" />

          <article className="group relative w-full max-w-2xl rounded-xl border border-dashed border-gray-300 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-gray-900">
              <Settings2 className="h-4 w-4 text-gray-500" aria-hidden="true" />
              {t('wizard.rename.title')}
            </div>
            <div className="overflow-hidden rounded-lg border border-gray-100">
              <table className="w-full min-w-[560px] text-left text-[13px]">
                <thead className="bg-gray-50/80 text-gray-600">
                  <tr>
                    <th className="px-4 py-2 font-medium">{t('wizard.rename.field')}</th>
                    <th className="px-4 py-2 font-medium">{t('wizard.rename.newField')}</th>
                    <th className="px-4 py-2 text-right font-medium">
                      {t('wizard.rename.transform')}
                    </th>
                    <th className="w-10 px-4 py-2">
                      <span className="sr-only">{t('common.actions')}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {fields.map((field) => (
                    <tr key={field}>
                      <td className="flex items-center gap-1.5 px-4 py-2 text-gray-700">
                        {field === 'DIRECT' && (
                          <ChevronRight className="h-3 w-3 text-gray-400" aria-hidden="true" />
                        )}
                        {field}
                      </td>
                      <td className="px-4 py-2 text-gray-700">{field}</td>
                      <td className="px-4 py-2">
                        <span className="sr-only">{t('wizard.rename.noTransform')}</span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="text-gray-400 hover:text-gray-600"
                          aria-label={t('wizard.rename.revert')}
                        >
                          <CornerUpLeft className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <ConnectorButton label={t('wizard.addOutput')} tone="red" />

          <div className="mt-4 flex w-full max-w-2xl flex-wrap items-center justify-center gap-4">
            <Button
              type="button"
              variant="outline"
              className="h-auto border-indigo-200 bg-white px-4 py-2 text-[13px] font-medium text-indigo-700 shadow-sm hover:bg-indigo-50"
            >
              <Table className="h-4 w-4" aria-hidden="true" />
              {t('wizard.createView')}
            </Button>
            <span className="text-[13px] text-gray-400">{t('wizard.or')}</span>
            <Button
              type="button"
              variant="outline"
              className="h-auto border-emerald-200 bg-white px-4 py-2 text-[13px] font-medium text-emerald-700 shadow-sm hover:bg-emerald-50"
            >
              <Zap className="h-4 w-4" aria-hidden="true" />
              {t('wizard.publishApi')}
            </Button>
          </div>
        </main>

        <aside className="flex min-h-[320px] w-full shrink-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm lg:w-[45%]">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-gray-100 px-4">
            <h2 className="text-[13px] font-medium text-gray-900">{t('wizard.preview.title')}</h2>
            <div className="flex overflow-hidden rounded-md border border-gray-200">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="rounded-none border-r border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                aria-label={t('wizard.preview.json')}
              >
                <Braces className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="icon-sm"
                className="rounded-none bg-gray-100 text-gray-900"
                aria-label={t('wizard.preview.grid')}
              >
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </div>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-gray-400">
            <div className="relative mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 shadow-sm">
                <Database className="h-8 w-8 text-gray-300" aria-hidden="true" />
              </div>
              <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full border border-gray-100 bg-white shadow-sm">
                <MessageSquare className="h-3 w-3 text-gray-300" aria-hidden="true" />
              </div>
            </div>
            <p className="text-[13px]">{t('wizard.preview.empty')}</p>
          </div>
        </aside>
      </div>
    </section>
  )
}

function ConnectorButton({ label, tone }: { label: string; tone: 'purple' | 'red' }) {
  return (
    <div className="relative my-2 flex h-10 w-px items-center justify-center border-l border-dashed border-gray-300 bg-gray-200">
      <Button
        type="button"
        variant="outline"
        size="icon-xs"
        className={`absolute z-10 rounded-full bg-white ${tone === 'purple' ? 'border-purple-200 text-purple-600 hover:bg-purple-50' : 'border-red-200 text-red-500 hover:bg-red-50'}`}
        aria-label={label}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
      </Button>
    </div>
  )
}
