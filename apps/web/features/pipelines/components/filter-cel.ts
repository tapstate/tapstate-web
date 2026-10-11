const ENVELOPE_FIELD = /^(?:after|before|schema)\.|^(?:op|ts|src)$/

export function celFilterField(field: string): string {
  const normalized = field.trim()
  return ENVELOPE_FIELD.test(normalized) ? normalized : `after.${normalized}`
}
