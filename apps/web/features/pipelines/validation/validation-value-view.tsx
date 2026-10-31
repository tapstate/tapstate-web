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

function displayValue(value: ValidationValue): Exclude<ValidationValue, { type: 'typed' }> {
  let current = value
  while (current.type === 'typed') current = current.value
  return current
}

function ValueTypeInformation({ value }: { value: ValidationValue }) {
  const { t } = useTranslation(),
    [open, setOpen] = useState(false)
  const layers: ValidationValue[] = []
  let current = value
  for (;;) {
    layers.push(current)
    if (current.type !== 'typed') break
    current = current.value
  }
  return (
    <details
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="text-text-secondary mt-2"
    >
      <summary className="cursor-pointer text-xs leading-4">
        {t('dataValidation.record.valueTypeDetails')}
      </summary>
      {open && (
        <div className="border-divider-subtle mt-2 space-y-3 border-l pl-3">
          {layers.map((layer, index) => (
            <div key={index}>
              <p className="font-mono text-xs font-medium">{layer.type}</p>
              {Object.entries(layer.metadata).length > 0 && (
                <dl className="mt-1 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs leading-5">
                  {Object.entries(layer.metadata).map(([name, text]) => (
                    <div key={name} className="contents">
                      <dt>{name}</dt>
                      <dd className="min-w-0 font-mono break-all whitespace-pre-wrap">{text}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          ))}
        </div>
      )}
    </details>
  )
}

/** Exact values lead the comparison; metadata and large branches remain optional and bounded. */
export function ValidationValueView({
  value,
  literalText = false,
  showTypeInfo = true,
}: {
  value: ValidationValue
  literalText?: boolean
  showTypeInfo?: boolean
}) {
  const { t } = useTranslation(),
    [open, setOpen] = useState(false),
    [page, setPage] = useState(1),
    [characters, setCharacters] = useState(512)
  const visual = displayValue(value)
  const children =
    visual.type === 'array'
      ? visual.value.map((child, index) => ({ name: String(index), value: child }))
      : visual.type === 'object'
        ? visual.value
        : null
  const safePage = Math.min(page, Math.max(1, Math.ceil((children?.length ?? 0) / 20)))
  if (children)
    return (
      <details
        open={open}
        onToggle={(event) => setOpen(event.currentTarget.open)}
        className="border-divider-subtle my-1 rounded-lg border px-3 py-2"
      >
        <summary className="text-text-secondary cursor-pointer text-xs leading-5 font-medium break-words">
          {value.metadata.logicalType ?? visual.metadata.observedType ?? visual.type} ·{' '}
          {children.length}
        </summary>
        {open && (
          <div className="mt-3 space-y-3 pl-1">
            {showTypeInfo && <ValueTypeInformation value={value} />}
            {children.slice((safePage - 1) * 20, safePage * 20).map((child, index) => (
              <div key={(safePage - 1) * 20 + index} className="min-w-0">
                <p className="text-text-primary font-mono text-xs font-medium break-all whitespace-pre-wrap">
                  {visual.type === 'object' ? validationLiteralName(child.name) : child.name}
                </p>
                <ValidationValueView
                  value={child.value}
                  literalText={literalText}
                  showTypeInfo={showTypeInfo}
                />
              </div>
            ))}
            {children.length > 20 && (
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
            )}
          </div>
        )}
      </details>
    )
  const text = literalText && visual.type === 'text' ? visual.value : validationScalarText(visual)
  return (
    <div className="min-w-0 space-y-1">
      <pre className="text-text-primary max-h-64 overflow-auto font-mono text-sm leading-5 break-all whitespace-pre-wrap">
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
      {showTypeInfo && <ValueTypeInformation value={value} />}
    </div>
  )
}
