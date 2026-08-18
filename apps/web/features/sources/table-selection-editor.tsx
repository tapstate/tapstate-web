import { Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { SourceTableView } from '@/service/source-client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type EditableSourceTable = SourceTableView

const EMPTY_VALUE = '__tapstate_empty_selector__'

function encode(value: string | null) {
  return value === null || value === '' ? EMPTY_VALUE : value
}

function decode(value: string) {
  return value === EMPTY_VALUE ? '' : value
}

export function TableSelectionEditor({
  value,
  disabled,
  onChange,
}: {
  value: SourceTableView[]
  disabled?: boolean
  onChange: (next: SourceTableView[]) => void
}) {
  const { t } = useTranslation()

  function update(index: number, patch: Partial<SourceTableView>) {
    onChange(
      value.map((table, tableIndex) => (tableIndex === index ? { ...table, ...patch } : table)),
    )
  }

  function add(type: SourceTableView['type']) {
    onChange([
      ...value,
      {
        type,
        name: type === 'literal' || type === 'spec' ? '' : null,
        pattern: type === 'regex' ? '' : null,
        filter: type === 'spec' ? '' : null,
        pk: type === 'spec' ? [] : null,
        options: {},
      },
    ])
  }

  return (
    <div className="space-y-2">
      {value.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-200 px-3 py-4 text-[12px] text-gray-500">
          {t('sources.edit.tablesEmpty')}
        </div>
      )}
      {value.map((table, index) => (
        <div
          key={`${table.type}-${index}`}
          className="rounded-lg border border-gray-200 bg-white p-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={encode(table.type)}
              disabled={disabled}
              onValueChange={(selected) => {
                if (selected === null) return
                const type = decode(selected) as SourceTableView['type']
                update(index, {
                  type,
                  name: type === 'regex' ? null : (table.name ?? ''),
                  pattern: type === 'regex' ? (table.pattern ?? '') : null,
                  filter: type === 'spec' ? (table.filter ?? '') : null,
                  pk: type === 'spec' ? (table.pk ?? []) : null,
                })
              }}
            >
              <SelectTrigger className="w-28" aria-label={t('sources.edit.tableType')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="literal">{t('sources.edit.tableTypes.literal')}</SelectItem>
                <SelectItem value="regex">{t('sources.edit.tableTypes.regex')}</SelectItem>
                <SelectItem value="spec">{t('sources.edit.tableTypes.spec')}</SelectItem>
              </SelectContent>
            </Select>
            <button
              type="button"
              disabled={disabled}
              className="ml-auto rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              aria-label={t('sources.edit.removeTable')}
              onClick={() => onChange(value.filter((_, tableIndex) => tableIndex !== index))}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {(table.type === 'literal' || table.type === 'spec') && (
              <input
                className="h-8 rounded-lg border border-gray-200 px-2.5 text-[12px]"
                value={table.name ?? ''}
                disabled={disabled}
                placeholder={t('sources.edit.tableName')}
                onChange={(event) => update(index, { name: event.target.value })}
              />
            )}
            {table.type === 'regex' && (
              <input
                className="h-8 rounded-lg border border-gray-200 px-2.5 text-[12px]"
                value={table.pattern ?? ''}
                disabled={disabled}
                placeholder={t('sources.edit.tablePattern')}
                onChange={(event) => update(index, { pattern: event.target.value })}
              />
            )}
            {table.type === 'spec' && (
              <>
                <input
                  className="h-8 rounded-lg border border-gray-200 px-2.5 text-[12px]"
                  value={table.filter ?? ''}
                  disabled={disabled}
                  placeholder={t('sources.edit.tableFilter')}
                  onChange={(event) => update(index, { filter: event.target.value })}
                />
                <input
                  className="h-8 rounded-lg border border-gray-200 px-2.5 text-[12px] sm:col-span-2"
                  value={(table.pk ?? []).join(', ')}
                  disabled={disabled}
                  placeholder={t('sources.edit.tablePk')}
                  onChange={(event) =>
                    update(index, {
                      pk: event.target.value
                        .split(',')
                        .map((item) => item.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </>
            )}
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-600 disabled:opacity-50"
          onClick={() => add('literal')}
        >
          <Plus className="h-3.5 w-3.5" /> {t('sources.edit.addLiteral')}
        </button>
        <button
          type="button"
          disabled={disabled}
          className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-600 disabled:opacity-50"
          onClick={() => add('regex')}
        >
          <Plus className="h-3.5 w-3.5" /> {t('sources.edit.addRegex')}
        </button>
        <button
          type="button"
          disabled={disabled}
          className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-600 disabled:opacity-50"
          onClick={() => add('spec')}
        >
          <Plus className="h-3.5 w-3.5" /> {t('sources.edit.addSpec')}
        </button>
      </div>
    </div>
  )
}
