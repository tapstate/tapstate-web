import { celFilterField, celFilterLiteral, type FilterLiteralKind } from '../filter-cel'

export interface WizardFilterCondition {
  field: string
  op: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'in' | 'starts_with'
  value: string
  literalKind?: FilterLiteralKind
  valueConfigured?: boolean
}

/** Only decode conditions the visual editor can represent without changing their meaning. */
export function parseWizardFilter(expression: string): WizardFilterCondition[] | null {
  if (!expression.trim()) return []
  const parts: string[] = []
  let quote = '',
    escaped = false,
    start = 0
  for (let index = 0; index < expression.length; index++) {
    const char = expression[index]
    if (escaped) {
      escaped = false
      continue
    }
    if (quote && char === '\\') {
      escaped = true
      continue
    }
    if (quote) {
      if (char === quote) quote = ''
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      continue
    }
    if (expression.slice(index, index + 2) === '&&') {
      parts.push(expression.slice(start, index).trim())
      index++
      start = index + 1
    }
  }
  if (quote) return null
  parts.push(expression.slice(start).trim())
  const rows: WizardFilterCondition[] = []
  for (const part of parts) {
    const comparison = part.match(/^([\w.]+)\s*(==|!=|>=|<=|>|<)\s*(.+)$/)
    const method = part.match(/^([\w.]+)\.(contains|startsWith)\((.+)\)$/)
    const match = comparison ?? method
    if (!match) return null
    const token = match[3].trim()
    let value: unknown
    try {
      value = JSON.parse(token)
    } catch {
      if (!/^'[^'\\]*'$/.test(token)) return null
      value = token.slice(1, -1)
    }
    if (value !== null && !['string', 'number', 'boolean'].includes(typeof value)) return null
    if (method && typeof value !== 'string') return null
    const op = match[2] === 'startsWith' ? 'starts_with' : (match[2] as WizardFilterCondition['op'])
    const row: WizardFilterCondition = {
      field: match[1].replace(/^after\./, ''),
      op,
      value: value === null ? 'null' : typeof value === 'number' ? token : String(value),
      literalKind: value === null ? 'null' : (typeof value as FilterLiteralKind),
      valueConfigured: true,
    }
    if (!/^(?:after|before|schema)\./.test(match[1]) && !['op', 'ts', 'src'].includes(match[1]))
      return null
    rows.push(row)
  }
  return rows
}

export function wizardFilterExpression(conditions: WizardFilterCondition[]) {
  return conditions
    .filter(
      (condition) =>
        condition.field.trim() &&
        (condition.valueConfigured || condition.value !== '' || condition.literalKind === 'string'),
    )
    .map((condition) => {
      const field = celFilterField(condition.field)
      const literal = celFilterLiteral(
        condition.value,
        undefined,
        condition.literalKind ?? 'string',
        condition.op === 'contains' || condition.op === 'starts_with',
      )
      if (condition.op === 'contains') return `${field}.contains(${literal})`
      if (condition.op === 'starts_with') return `${field}.startsWith(${literal})`
      return `${field} ${condition.op} ${literal}`
    })
    .join(' && ')
}
