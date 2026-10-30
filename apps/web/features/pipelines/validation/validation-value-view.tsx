import { Button } from '@tapstate-web/ui/button'
import { Pagination } from '@tapstate-web/ui/pagination'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { ValidationValue } from '@/service/pipelines/validation-client'

export function validationLiteralName(name: string): string {
  return JSON.stringify(name).replace(
    /[\u007f-\u009f\u00a0\u1680\u2000-\u200f\u2028-\u202f\u205f-\u206f\u3000\ufeff]/g,
    (unit) => '\\u' + unit.charCodeAt(0).toString(16).padStart(4, '0'),
  )
}

export function validationScalarText(value: ValidationValue): string {
  if (value.type === 'text') return JSON.stringify(value.value)
  if (value.type === 'decimal') {
    const scale = BigInt(value.metadata.scale!),
      raw = value.value,
      negative = raw.startsWith('-'),
      digits = negative ? raw.slice(1) : raw
    if (
      scale > 4096n ||
      scale < -4096n ||
      BigInt(digits.length) + (scale < 0n ? -scale : scale) > 4096n
    )
      return `${raw} × 10^(${-scale})`
    const places = Number(scale),
      prefix = negative ? '-' : ''
    if (places <= 0) return prefix + (digits === '0' ? '0' : digits + '0'.repeat(-places))
    if (digits.length > places)
      return (
        prefix +
        digits.slice(0, digits.length - places) +
        '.' +
        digits.slice(digits.length - places)
      )
    return prefix + '0.' + '0'.repeat(places - digits.length) + digits
  }
  if (value.type === 'float32-bits' || value.type === 'float64-bits') return `0x${value.value}`
  return value.value === null ? 'null' : String(value.value)
}

/** Exact wire values stay typed; large branches mount only when opened and are paged. */
export function ValidationValueView({
  value,
  literalText = false,
}: {
  value: ValidationValue
  literalText?: boolean
}) {
  const { t } = useTranslation(),
    [open, setOpen] = useState(false),
    [page, setPage] = useState(1),
    [characters, setCharacters] = useState(512)
  const children =
    value.type === 'array'
      ? value.value.map((child, index) => ({ name: String(index), value: child }))
      : value.type === 'object'
        ? value.value
        : value.type === 'typed'
          ? [{ name: value.metadata.logicalType ?? 'typed', value: value.value }]
          : null
  const safePage = Math.min(page, Math.max(1, Math.ceil((children?.length ?? 0) / 20)))
  if (children)
    return (
      <details
        open={open}
        onToggle={(event) => setOpen(event.currentTarget.open)}
        className="border-divider-subtle my-1 rounded border p-2"
      >
        <summary className="system-xs-medium text-text-secondary cursor-pointer break-words">
          {value.metadata.observedType ?? value.type} · {children.length}
        </summary>
        {open && (
          <div className="mt-2 space-y-2 pl-2">
            {Object.entries(value.metadata).map(([name, text]) => (
              <p key={name} className="system-xs-regular text-text-tertiary break-all">
                {name}: {text}
              </p>
            ))}
            {children.slice((safePage - 1) * 20, safePage * 20).map((child, index) => (
              <div key={(safePage - 1) * 20 + index} className="min-w-0">
                <p className="system-xs-semibold text-text-primary font-mono break-all whitespace-pre-wrap">
                  {value.type === 'object' ? validationLiteralName(child.name) : child.name}
                </p>
                <ValidationValueView value={child.value} literalText={literalText} />
              </div>
            ))}
            <Pagination
              page={safePage}
              totalPages={Math.ceil(children.length / 20)}
              onPageChange={setPage}
              labels={{
                previous: t('dataValidation.previous'),
                next: t('dataValidation.next'),
                pageNumberInput: t('dataValidation.pageNumber'),
              }}
            />
          </div>
        )}
      </details>
    )
  const text = literalText && value.type === 'text' ? value.value : validationScalarText(value)
  return (
    <div className="min-w-0 space-y-1">
      <p className="system-xs-regular text-text-tertiary">
        {value.type}
        {Object.entries(value.metadata).map(([name, text]) => (
          <span key={name}>
            {' '}
            · {name}: {text}
          </span>
        ))}
      </p>
      <pre className="system-xs-regular text-text-primary max-h-64 overflow-auto font-mono break-all whitespace-pre-wrap">
        {text.slice(0, characters)}
      </pre>
      {text.length > characters && (
        <Button
          size="small"
          variant="ghost-accent"
          onClick={() => setCharacters((count) => count + 4096)}
        >
          {t('dataValidation.showMore', { shown: characters, total: text.length })}
        </Button>
      )}
    </div>
  )
}
