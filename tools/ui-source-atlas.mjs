import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

// Documentation analysis only. Source files are parsed, never imported or executed.
const sourceRoot = path.resolve(process.argv[2] || '')
if (!process.argv[2] || !fs.existsSync(path.join(sourceRoot, 'web/app'))) {
  throw new Error('Usage: node tools/ui-source-atlas.mjs <reference-source-root>')
}
const repoRoot = path.resolve(import.meta.dirname, '..')
const outputRoot = path.join(repoRoot, 'docs/engineering/ui')
const packageRoot = fs
  .readdirSync(path.join(sourceRoot, 'packages'))
  .map((name) => path.join(sourceRoot, 'packages', name))
  .find((dir) => fs.existsSync(path.join(dir, 'src/themes/theme.css')))
if (!packageRoot) throw new Error('Reference component package was not found')
const manifest = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'))
const sourceName = path.basename(packageRoot).replace(/-ui$/, '')
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const normalize = (value) =>
  String(value)
    .replaceAll(packageRoot, 'component-package')
    .replaceAll(path.relative(sourceRoot, packageRoot), 'component-package')
    .replaceAll(manifest.name, '@reference/ui')
    .replace(new RegExp(`\\b${escape(sourceName)}\\b`, 'gi'), 'reference')
    .replace(
      new RegExp(escape(sourceName[0].toUpperCase() + sourceName.slice(1)), 'g'),
      'Reference',
    )
const rel = (file) => normalize(path.relative(sourceRoot, file).split(path.sep).join('/'))
const read = (file) => fs.readFileSync(file, 'utf8')
const hash = (text) => crypto.createHash('sha256').update(text).digest('hex')
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()
const ignored = new Set([
  'node_modules',
  '.git',
  '.next',
  '.storybook',
  'dist',
  'coverage',
  '__tests__',
  '__mocks__',
  '__fixtures__',
  'tests',
  'stories',
])
function walk(dir, result = []) {
  for (const entry of fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))) {
    if (ignored.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, result)
    else if (entry.isFile() && !/\.(?:spec|test|stories)\.[cm]?[jt]sx?$/.test(entry.name))
      result.push(full)
  }
  return result
}
const webFiles = walk(path.join(sourceRoot, 'web'))
const packageFiles = walk(path.join(packageRoot, 'src'))
const files = [...new Set([...webFiles, ...packageFiles])]
  .filter((file) => file.endsWith('.tsx'))
  .sort()
const classPrefix =
  /^!?-?(?:flex|grid|block|hidden|inline|relative|absolute|fixed|sticky|isolate|size-|[wh]-|min-|max-|[mp][xysetrbl]?-|gap-|space-|items-|justify-|self-|text-|bg-|border|rounded|shadow|ring|outline|overflow|z-|inset|top-|bottom-|left-|right-|start-|end-|font-|leading-|tracking-|system-|title-|body-|i-ri-|transition|duration-|animate-|opacity-|cursor-|pointer-|select-|truncate|whitespace-|break-|wrap-|shrink|grow|basis-|object-|aspect-|divide-|backdrop|translate|scale|rotate|fill-|stroke-|touch-|overscroll|scroll-|sr-only|not-sr-only|contents|table|col-|row-|place-|origin-|line-clamp|forced-color)/
function isClass(value) {
  let depth = 0,
    start = 0
  for (let index = 0; index < value.length; index++) {
    if (value[index] === '[' || value[index] === '(') depth++
    else if (value[index] === ']' || value[index] === ')') depth--
    else if (value[index] === ':' && depth === 0) start = index + 1
  }
  return classPrefix.test(value.slice(start))
}
const semanticClass =
  /(?:^|:)(?:bg|text|border|ring|outline|fill|stroke|divide|from|to|via|decoration)-(?:text|background|components|state|divider|workflow|util-colors|effects|shadow)-[\w-]+/
const stateClass =
  /(?:hover|focus|active|disabled|checked|selected|invalid|read-only|open|data-|aria-|motion-reduce|forced-colors|group-|peer-|has-)/
const responsiveClass = /^(?:sm|md|lg|xl|2xl|mobile|tablet|pc|2k|max-|min-|@)/
const controlTag =
  /(?:Button|Input|Textarea|Select|Combobox|Autocomplete|Checkbox|Radio|Switch|Dialog|Drawer|Popover|Tooltip|Infotip|Tabs|Pagination|Search|Field|Form|Spinner|Skeleton|Empty|Loading|Chip|Upload|Editor|Markdown|Chart|Table|Menu|Tree)/
function resolveImport(spec, file) {
  let base
  if (spec.startsWith('.')) base = path.resolve(path.dirname(file), spec)
  else if (spec.startsWith('@/')) base = path.join(sourceRoot, 'web', spec.slice(2))
  else if (spec === manifest.name || spec.startsWith(`${manifest.name}/`)) {
    const key = spec === manifest.name ? '.' : `.${spec.slice(manifest.name.length)}`
    const entry = manifest.exports?.[key]
    const target =
      typeof entry === 'string' ? entry : entry?.import || entry?.default || entry?.types
    if (typeof target === 'string') base = path.resolve(packageRoot, target)
  }
  if (!base) return undefined
  return [
    base,
    `${base}.tsx`,
    `${base}.ts`,
    `${base}.css`,
    path.join(base, 'index.tsx'),
    path.join(base, 'index.ts'),
  ].find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile())
}
const records = files.map((file) => {
  const text = read(file)
  const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const line = (node) => ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1
  const tags = new Map(),
    classes = new Set(),
    imports = [],
    attributes = new Map(),
    names = new Set(),
    conditions = [],
    localValues = new Map()
  let jsxCount = 0
  function index(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer)
      localValues.set(node.name.text, node.initializer)
    ts.forEachChild(node, index)
  }
  index(ast)
  function styleStrings(node, seen = new Set(), depth = 0) {
    if (!node || depth > 5) return
    if (ts.isStringLiteralLike(node)) {
      for (const value of node.text.split(/\s+/)) if (isClass(value)) classes.add(value)
    } else if (ts.isIdentifier(node) && localValues.has(node.text) && !seen.has(node.text)) {
      const next = new Set(seen).add(node.text)
      styleStrings(localValues.get(node.text), next, depth + 1)
    } else ts.forEachChild(node, (child) => styleStrings(child, seen, depth + 1))
  }
  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const spec = node.moduleSpecifier.text
      const resolved = resolveImport(spec, file)
      imports.push({
        specifier: normalize(spec),
        line: line(node),
        ...(resolved ? { resolved: rel(resolved) } : {}),
      })
    }
    if (ts.isFunctionDeclaration(node) && node.name && /^[A-Z]/.test(node.name.text))
      names.add(node.name.text)
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      /^[A-Z]/.test(node.name.text) &&
      node.initializer &&
      (ts.isArrowFunction(node.initializer) ||
        ts.isFunctionExpression(node.initializer) ||
        ts.isCallExpression(node.initializer))
    )
      names.add(node.name.text)
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      jsxCount++
      const name = node.tagName.getText(ast)
      if (!tags.has(name)) tags.set(name, line(node))
      for (const prop of node.attributes.properties) {
        if (!ts.isJsxAttribute(prop)) continue
        const name = prop.name.getText(ast)
        if (name === 'className') styleStrings(prop.initializer)
        if (
          /^(?:aria-|role$|htmlFor$|disabled$|readOnly$|required$|on[A-Z]|open$|value$|defaultValue$|keepMounted$|modal$|data-)/.test(
            name,
          ) &&
          !attributes.has(name)
        )
          attributes.set(name, line(prop))
      }
    }
    if (
      ts.isCallExpression(node) &&
      /^(?:cn|clsx|classNames|cva|tv)$/.test(node.expression.getText(ast))
    )
      for (const arg of node.arguments) styleStrings(arg)
    if (
      ts.isVariableDeclaration(node) &&
      /(?:ClassName|className|Variants|variants)$/.test(node.name.getText(ast))
    )
      styleStrings(node.initializer)
    if (
      ts.isIfStatement(node) ||
      ts.isConditionalExpression(node) ||
      (ts.isBinaryExpression(node) &&
        [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken].includes(
          node.operatorToken.kind,
        ))
    ) {
      const expr = ts.isIfStatement(node)
        ? node.expression
        : ts.isConditionalExpression(node)
          ? node.condition
          : node.left
      conditions.push({
        expression: normalize(expr.getText(ast).slice(0, 180)),
        line: line(expr),
        syntax: ts.isIfStatement(node)
          ? 'if'
          : ts.isConditionalExpression(node)
            ? 'ternary'
            : 'logical',
      })
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
  const sourcePath = rel(file)
  const family = sourcePath.startsWith('component-package/')
    ? 'component-package'
    : sourcePath.startsWith('web/app/components/')
      ? sourcePath.split('/')[3]
      : sourcePath.startsWith('web/features/')
        ? `feature/${sourcePath.split('/')[2]}`
        : 'routes-and-layouts'
  const allClasses = [...classes].sort()
  const routeFile =
    sourcePath.startsWith('web/app/') && !sourcePath.startsWith('web/app/components/')
  const role =
    routeFile && path.basename(file) === 'page.tsx'
      ? 'page'
      : routeFile && path.basename(file) === 'layout.tsx'
        ? 'layout'
        : /(?:\/icons\/|\/icon\/|icons?\.tsx$)/.test(sourcePath)
          ? 'icon-asset'
          : jsxCount
            ? 'ui-component'
            : 'contract-or-wrapper'
  return {
    path: sourcePath,
    family,
    role,
    sha256: hash(text),
    lines: ast.getLineAndCharacterOfPosition(text.length).line + 1,
    analysis: 'static-typescript-ast',
    parseErrors: ast.parseDiagnostics.length,
    components: [...names].map(normalize),
    anatomy: [...tags].map(([name, at]) => ({ name: normalize(name), line: at })),
    controls: [...tags]
      .filter(([name]) => controlTag.test(name))
      .map(([name, at]) => ({ name: normalize(name), line: at })),
    imports,
    supportingStyles: imports
      .filter((item) => (item.resolved || '').endsWith('.css'))
      .map((item) => item.resolved),
    semanticClasses: allClasses.filter((value) => semanticClass.test(value)),
    geometryAndTypography: allClasses.filter(
      (value) =>
        !semanticClass.test(value) && !stateClass.test(value) && !responsiveClass.test(value),
    ),
    stateClasses: allClasses.filter((value) => stateClass.test(value)),
    responsiveClasses: allClasses.filter((value) => responsiveClass.test(value)),
    arbitraryClasses: allClasses.filter((value) => value.includes('[')),
    attributes: [...attributes].map(([name, at]) => ({ name, line: at })),
    conditions,
    cssVariables: [...new Set(text.match(/--[\w-]+/g) || [])].sort(),
    evidenceLimits: [
      'Computed CSS, actual data states, focus behavior and browser rendering are not established by AST analysis.',
    ],
  }
})
const byPath = new Map(records.map((record) => [record.path, record]))
for (const record of records.filter((record) => record.role === 'page')) {
  const reachable = new Set()
  const queue = [record.path]
  while (queue.length) {
    const current = byPath.get(queue.pop())
    if (!current) continue
    for (const item of current.imports)
      if (item.resolved && byPath.has(item.resolved) && !reachable.has(item.resolved)) {
        reachable.add(item.resolved)
        queue.push(item.resolved)
      }
  }
  record.possibleDelegatedUiCount = reachable.size
  record.possibleDelegatedUi = [...reachable].sort()
}
function declarations(file, label) {
  if (!fs.existsSync(file)) return []
  const text = read(file)
  return [...text.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+);/g)].map((match) => ({
    name: match[1],
    value: match[2].replace(/\s+/g, ' ').trim(),
    references: [...new Set([...match[2].matchAll(/var\(\s*(--[\w-]+)/g)].map((item) => item[1]))],
    source: label,
    line: text.slice(0, match.index).split('\n').length,
  }))
}
const declarationSets = {
  referenceLight: declarations(
    path.join(packageRoot, 'src/themes/light.css'),
    'component-package/src/themes/light.css',
  ),
  referenceDark: declarations(
    path.join(packageRoot, 'src/themes/dark.css'),
    'component-package/src/themes/dark.css',
  ),
  referenceRegistry: declarations(
    path.join(packageRoot, 'src/themes/theme.css'),
    'component-package/src/themes/theme.css',
  ),
  referencePreset: declarations(
    path.join(packageRoot, 'src/styles/styles.css'),
    'component-package/src/styles/styles.css',
  ),
  appLight: declarations(
    path.join(sourceRoot, 'web/themes/manual-light.css'),
    'web/themes/manual-light.css',
  ),
  appDark: declarations(
    path.join(sourceRoot, 'web/themes/manual-dark.css'),
    'web/themes/manual-dark.css',
  ),
  appTheme: declarations(
    path.join(sourceRoot, 'web/app/styles/tailwind-core.css'),
    'web/app/styles/tailwind-core.css',
  ),
  shippedLight: declarations(
    path.join(repoRoot, 'packages/ui/src/themes/light.css'),
    'packages/ui/src/themes/light.css',
  ),
  shippedDark: declarations(
    path.join(repoRoot, 'packages/ui/src/themes/dark.css'),
    'packages/ui/src/themes/dark.css',
  ),
  shippedPreset: declarations(
    path.join(repoRoot, 'packages/ui/src/styles/styles.css'),
    'packages/ui/src/styles/styles.css',
  ),
}
const appOverrides = ['apps/web/styles', 'apps/cloud/app/styles'].flatMap((dir) =>
  walk(path.join(repoRoot, dir))
    .filter((file) => file.endsWith('.css'))
    .flatMap((file) => declarations(file, path.relative(repoRoot, file).split(path.sep).join('/'))),
)
const tokenNames = [
  ...new Set(
    Object.values(declarationSets)
      .flat()
      .map((item) => item.name),
  ),
].sort()
const localStyleInputs = [
  'packages/ui/src/themes/light.css',
  'packages/ui/src/themes/dark.css',
  'packages/ui/src/styles/styles.css',
  ...new Set(
    appOverrides.filter((item) => tokenNames.includes(item.name)).map((item) => item.source),
  ),
]
  .sort()
  .map((file) => ({ path: file, sha256: hash(read(path.join(repoRoot, file))) }))
const tokens = tokenNames.map((name) => {
  const definitions = Object.fromEntries(
    Object.entries(declarationSets).flatMap(([key, values]) => {
      const item = values.find((value) => value.name === name)
      return item
        ? [
            [
              key,
              {
                value: item.value,
                references: item.references,
                source: item.source,
                line: item.line,
              },
            ],
          ]
        : []
    }),
  )
  const hasReference = Boolean(
    definitions.referenceLight ||
    definitions.referenceDark ||
    definitions.appLight ||
    definitions.appDark ||
    definitions.appTheme ||
    definitions.referencePreset,
  )
  const localOverrides = appOverrides.filter((item) => item.name === name)
  const hasPackage = Boolean(
    definitions.shippedLight || definitions.shippedDark || definitions.shippedPreset,
  )
  const hasLocal = hasPackage || localOverrides.length > 0
  const differs = ['Light', 'Dark'].some(
    (mode) =>
      definitions[`reference${mode}`] &&
      definitions[`shipped${mode}`] &&
      definitions[`reference${mode}`].value !== definitions[`shipped${mode}`].value,
  )
  const brandOnly =
    name.toLowerCase().includes(sourceName.toLowerCase()) || /logo|^--color-ui-brand-/.test(name)
  return {
    name,
    family: name.replace(/^--(?:color-)?/, '').split('-')[0],
    availability: hasLocal
      ? hasReference
        ? differs
          ? 'different-from-shipped'
          : 'shared-or-local-override'
        : 'shipped-only'
      : 'reference-only',
    adoption: brandOnly
      ? 'excluded-brand-or-logo'
      : hasPackage
        ? 'available-in-shipped-package'
        : hasLocal
          ? 'app-local-check-consumer-scope'
          : 'reference-only-requires-explicit-port',
    identifierIsNeutralAlias: brandOnly && name.toLowerCase().includes(sourceName.toLowerCase()),
    definitions,
    localOverrides,
  }
})
const typographyText = read(path.join(packageRoot, 'src/styles/utilities.css'))
const typography = [...typographyText.matchAll(/@utility\s+([\w-]+)\s*\{([^}]+)\}/g)].map(
  (match) => ({
    name: match[1],
    declarations: match[2].trim().replace(/\s+/g, ' '),
    line: typographyText.slice(0, match.index).split('\n').length,
  }),
)
const sourceStyles = [...webFiles, ...packageFiles]
  .filter((file) => file.endsWith('.css'))
  .map((file) => {
    const text = read(file)
    return {
      path: rel(file),
      sha256: hash(text),
      declarations: declarations(file, rel(file)),
      tokenReferences: [
        ...new Set([...text.matchAll(/var\(\s*(--[\w-]+)/g)].map((match) => match[1])),
      ].sort(),
    }
  })
const tokenUsage = new Map()
function useToken(name, source) {
  if (!tokenUsage.has(name)) tokenUsage.set(name, new Set())
  tokenUsage.get(name).add(source)
}
for (const row of records) {
  for (const name of row.cssVariables) useToken(name, row.path)
  for (const value of row.semanticClasses) {
    const match = value.match(
      /(?:^|:)(?:bg|text|border|ring|outline|fill|stroke|divide|from|to|via|decoration)-((?:text|background|components|state|divider|workflow|util-colors|effects|shadow)-[\w-]+)/,
    )
    if (match) useToken(`--color-${match[1]}`, row.path)
  }
  for (const value of row.geometryAndTypography)
    if (/^shadow-[\w-]+$/.test(value)) useToken(`--${value}`, row.path)
}
for (const row of sourceStyles) for (const name of row.tokenReferences) useToken(name, row.path)
for (const token of tokens) {
  token.directUsageFiles = [...(tokenUsage.get(token.name) || [])].sort()
  token.referenceThemePair = Boolean(
    token.definitions.referenceLight && token.definitions.referenceDark,
  )
}
const exportEntries = Object.entries(manifest.exports || {}).map(([subpath, value]) => ({
  subpath,
  source: normalize(
    typeof value === 'string' ? value : value.import || value.default || value.types,
  ),
  exists: fs.existsSync(
    path.resolve(
      packageRoot,
      typeof value === 'string' ? value : value.import || value.default || value.types,
    ),
  ),
}))
const families = [...new Set(records.map((record) => record.family))].sort().map((name) => {
  const rows = records.filter((record) => record.family === name)
  const frequency = (field) =>
    Object.entries(
      rows
        .flatMap((row) => row[field])
        .reduce((acc, value) => {
          acc[value] = (acc[value] || 0) + 1
          return acc
        }, {}),
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([value, files]) => ({ value, files }))
  return {
    name,
    files: rows.length,
    roles: Object.fromEntries(
      [...new Set(rows.map((row) => row.role))].map((role) => [
        role,
        rows.filter((row) => row.role === role).length,
      ]),
    ),
    semanticClasses: frequency('semanticClasses'),
    geometryAndTypography: frequency('geometryAndTypography'),
    stateClasses: frequency('stateClasses'),
  }
})
const metadata = {
  sourceRevision: git(sourceRoot, 'rev-parse', 'HEAD'),
  sourceCommitTime: git(sourceRoot, 'show', '-s', '--format=%cI'),
  localSnapshotRevision: git(repoRoot, 'rev-parse', 'HEAD'),
  method:
    'TypeScript AST, recursive local UI import traversal and CSS declaration extraction; no reference modules executed.',
  pathAliases: {
    'component-package':
      'The reference workspace package discovered by src/themes/theme.css. Application paths retain their repository-relative web/ prefix.',
  },
  evidence:
    'Source analysis only. Import traversal over-approximates possible dependencies and does not select runtime branches. Frequency is descriptive, not a universal design default. Browser and product acceptance require separate evidence.',
  counts: {
    sourceFiles: records.length,
    pages: records.filter((record) => record.role === 'page').length,
    layouts: records.filter((record) => record.role === 'layout').length,
    componentFiles: records.filter((record) => record.role === 'ui-component').length,
    iconAssets: records.filter((record) => record.role === 'icon-asset').length,
    wrappers: records.filter((record) => record.role === 'contract-or-wrapper').length,
    parseErrors: records.reduce((sum, row) => sum + row.parseErrors, 0),
    styleFiles: sourceStyles.length,
    publicSubpaths: exportEntries.length,
    tokens: tokens.length,
    typographyUtilities: typography.length,
  },
}
fs.mkdirSync(outputRoot, { recursive: true })
for (const [filename, value] of [
  [
    'source-atlas.json',
    { metadata, families, exports: exportEntries, files: records, styles: sourceStyles },
  ],
  [
    'token-catalog.json',
    {
      metadata: {
        sourceRevision: metadata.sourceRevision,
        localStylesheets: localStyleInputs,
        method:
          'CSS declaration extraction; values are evidence, not app overrides. Source-branded identifiers are neutral evidence aliases, excluded from adoption, not executable token names.',
      },
      summary: Object.fromEntries(
        Object.entries(declarationSets).map(([key, values]) => [key, values.length]),
      ),
      typography,
      tokens,
    },
  ],
])
  fs.writeFileSync(
    path.join(outputRoot, filename),
    `${normalize(JSON.stringify(value, null, filename === 'source-atlas.json' ? undefined : 2))}\n`,
  )
const lines = [
  '# Source coverage',
  '',
  `Source revision: \`${metadata.sourceRevision}\`.`,
  '',
  'This is a generated source-analysis inventory, not browser acceptance. Every included runtime TSX file was parsed. Route wrappers are followed through local UI imports; per-file evidence is retained in [source-atlas.json](source-atlas.json). Tests, stories, mocks, dependencies, builds and generated outputs are excluded.',
  '',
  'Regenerate from the Web repository root with `node tools/ui-source-atlas.mjs <reference-source-root>`. The analyzer reads source and writes documentation data only.',
  '',
  '| Surface | Count |',
  '| --- | ---: |',
  ...Object.entries(metadata.counts).map(([key, value]) => `| ${key} | ${value} |`),
  '',
  '## Source families',
  '',
  '| Family | Files | Source roles |',
  '| --- | ---: | --- |',
  ...families.map(
    (family) =>
      `| ${family.name} | ${family.files} | ${Object.entries(family.roles)
        .map(([role, count]) => `${role}: ${count}`)
        .join(', ')} |`,
  ),
  '',
  '## Per-file analysis',
  '',
  'Each row names controls, actual semantic classes, explicit if/ternary/logical branches and responsive classes found in that file. A branch is syntax evidence, not proof of a user-facing state. A dash means no direct evidence, not proof that the feature lacks that state. Possible delegated UI, complete class sets, exact line references, hashes and CSS dependencies are in the JSON atlas.',
  '',
]
const cell = (values) =>
  values.length
    ? values
        .slice(0, 5)
        .map((value) =>
          String(value).replace(/\s+/g, ' ').replaceAll('|', '\\|').replaceAll('`', ''),
        )
        .join(', ') + (values.length > 5 ? ` (+${values.length - 5})` : '')
    : '—'
for (const family of families) {
  lines.push(
    `<details><summary>${family.name}: ${family.files} files</summary>`,
    '',
    '| Source file | Role | Controls | Tokens | Explicit branches | Responsive |',
    '| --- | --- | --- | --- | --- | --- |',
  )
  for (const row of records.filter((row) => row.family === family.name))
    lines.push(
      `| ${row.path} | ${row.role} | ${cell(row.controls.map((item) => `${item.name}:${item.line}`))} | ${cell(row.semanticClasses)} | ${cell(row.conditions.map((item) => `${item.expression}:${item.line}`))} | ${cell(row.responsiveClasses)} |`,
    )
  lines.push('', '</details>', '')
}
fs.writeFileSync(
  path.join(outputRoot, 'source-coverage.md'),
  `${normalize(lines.join('\n')).replaceAll('—', 'none detected')}\n`,
)
const mdValue = (value) =>
  String(value || 'not declared')
    .replaceAll('|', '\\|')
    .replaceAll('`', '')
    .replace(/\s+/g, ' ')
const tokenLines = [
  '# Complete token reference',
  '',
  `Reference revision: \`${metadata.sourceRevision}\`.`,
  '',
  'Every extracted custom property is listed below. Definitions, line citations, variable dependencies and direct source usage files are preserved in [token-catalog.json](token-catalog.json). Color values describe the reference, not permission to replace Tapstate branding. Entries labelled excluded are evidence aliases or product marks and must not be used as executable token names. Reference-only variables require an explicit local port.',
  '',
]
for (const family of [...new Set(tokens.map((token) => token.family))].sort()) {
  const rows = tokens.filter((token) => token.family === family)
  tokenLines.push(
    `<details><summary>${normalize(family)}: ${rows.length} properties</summary>`,
    '',
    '| Property | Reference light | Reference dark | Local light | Adoption | Direct evidence files |',
    '| --- | --- | --- | --- | --- | ---: |',
  )
  for (const token of rows)
    tokenLines.push(
      `| ${normalize(token.name)}${token.identifierIsNeutralAlias ? ' (neutral evidence alias)' : ''} | ${mdValue(token.definitions.referenceLight?.value || token.definitions.appLight?.value || token.definitions.referencePreset?.value || token.definitions.appTheme?.value)} | ${mdValue(token.definitions.referenceDark?.value || token.definitions.appDark?.value)} | ${mdValue(token.definitions.shippedLight?.value)} | ${token.adoption} | ${token.directUsageFiles.length} |`,
    )
  tokenLines.push('', '</details>', '')
}
fs.writeFileSync(
  path.join(outputRoot, 'token-reference.md'),
  `${normalize(tokenLines.join('\n'))}\n`,
)
fs.writeFileSync(
  path.join(outputRoot, 'typography-reference.md'),
  [
    '# Complete typography reference',
    '',
    `Reference revision: \`${metadata.sourceRevision}\`. Source: \`component-package/src/styles/utilities.css\`.`,
    '',
    'These are exact utility definitions. Choose a role from the matching component/page; this table is not a universal font-size default.',
    '',
    '| Utility | CSS declarations | Source line |',
    '| --- | --- | ---: |',
    ...typography.map((item) => `| ${item.name} | ${mdValue(item.declarations)} | ${item.line} |`),
    '',
  ].join('\n'),
)
console.log(
  JSON.stringify(
    {
      revision: metadata.sourceRevision,
      counts: metadata.counts,
      output: path.relative(repoRoot, outputRoot),
      familyCount: families.length,
      tokenAvailability: Object.fromEntries(
        [...new Set(tokens.map((token) => token.availability))].map((status) => [
          status,
          tokens.filter((token) => token.availability === status).length,
        ]),
      ),
    },
    null,
    2,
  ),
)
