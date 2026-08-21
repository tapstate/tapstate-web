import { Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { SourceTableView } from '@/service/source-client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

export function createTableSelection(type: SourceTableView['type']): SourceTableView {
  return {
    type,
    name: type === 'literal' || type === 'spec' ? '' : null,
    pattern: type === 'regex' ? '' : null,
    filter: type === 'spec' ? '' : null,
    pk: type === 'spec' ? [] : null,
    options: type === 'spec' ? {} : null,
  }
}

export function updateTableSelectionType(
  table: SourceTableView,
  type: SourceTableView['type'],
): SourceTableView {
  return {
    ...table,
    type,
    name: type === 'regex' ? null : (table.name ?? ''),
    pattern: type === 'regex' ? (table.pattern ?? '') : null,
    filter: type === 'spec' ? (table.filter ?? '') : null,
    pk: type === 'spec' ? (table.pk ?? []) : null,
    options: type === 'spec' ? (table.options ?? {}) : null,
  }
}

function FieldLabel({ children }: { children: string }) {
  return <span className="text-foreground text-[13px] font-medium">{children}</span>
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
    onChange([...value, createTableSelection(type)])
  }

  return (
    <div className="flex flex-col gap-3">
      {value.length === 0 && (
        <div className="border-border text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-[12px] leading-relaxed">
          {t('sources.edit.tablesEmpty')}
        </div>
      )}

      {value.map((table, index) => (
        <div
          key={`${table.type}-${index}`}
          className="border-border bg-background rounded-lg border p-3"
        >
          <div className="flex items-center gap-2">
            <Select
              value={encode(table.type)}
              disabled={disabled}
              onValueChange={(selected) => {
                if (selected === null) return
                update(index, updateTableSelectionType(table, decode(selected)))
              }}
            >
              <SelectTrigger className="w-32" aria-label={t('sources.edit.tableType')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="literal">{t('sources.edit.tableTypes.literal')}</SelectItem>
                <SelectItem value="regex">{t('sources.edit.tableTypes.regex')}</SelectItem>
                <SelectItem value="spec">{t('sources.edit.tableTypes.spec')}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon-sm"
              type="button"
              disabled={disabled}
              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive ml-auto"
              aria-label={t('sources.edit.removeTable')}
              onClick={() => onChange(value.filter((_, tableIndex) => tableIndex !== index))}
            >
              <Trash2 />
            </Button>
          </div>

          <div className="mt-3 flex flex-col gap-3">
            {(table.type === 'literal' || table.type === 'spec') && (
              <label className="grid gap-1.5">
                <FieldLabel>{t('sources.edit.tableName')}</FieldLabel>
                <Input
                  value={table.name ?? ''}
                  disabled={disabled}
                  onChange={(event) => update(index, { name: event.target.value })}
                />
              </label>
            )}
            {table.type === 'regex' && (
              <label className="grid gap-1.5">
                <FieldLabel>{t('sources.edit.tablePattern')}</FieldLabel>
                <Input
                  value={table.pattern ?? ''}
                  disabled={disabled}
                  onChange={(event) => update(index, { pattern: event.target.value })}
                />
              </label>
            )}
            {table.type === 'spec' && (
              <>
                <label className="grid gap-1.5">
                  <FieldLabel>{t('sources.edit.tableFilter')}</FieldLabel>
                  <Input
                    value={table.filter ?? ''}
                    disabled={disabled}
                    onChange={(event) => update(index, { filter: event.target.value })}
                  />
                </label>
                <label className="grid gap-1.5">
                  <FieldLabel>{t('sources.edit.tablePk')}</FieldLabel>
                  <Input
                    value={(table.pk ?? []).join(', ')}
                    disabled={disabled}
                    onChange={(event) =>
                      update(index, {
                        pk: event.target.value
                          .split(',')
                          .map((item) => item.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </label>
              </>
            )}
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          type="button"
          disabled={disabled}
          onClick={() => add('literal')}
        >
          <Plus />
          {t('sources.edit.addLiteral')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          type="button"
          disabled={disabled}
          onClick={() => add('regex')}
        >
          <Plus />
          {t('sources.edit.addRegex')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          type="button"
          disabled={disabled}
          onClick={() => add('spec')}
        >
          <Plus />
          {t('sources.edit.addSpec')}
        </Button>
      </div>
    </div>
  )
}
