import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const study = path.join(root, 'docs/engineering/ui')
const read = (file) => fs.readFileSync(file, 'utf8')
const json = (file) => JSON.parse(read(path.join(study, file)))
const atlas = json('source-atlas.json')
const tokens = json('token-catalog.json')
const pages = json('page-evidence.json')
const components = json('component-evidence.json')
const manifest = JSON.parse(read(path.join(root, 'packages/ui/package.json')))
const problems = []
const requireFact = (condition, message) => {
  if (!condition) problems.push(message)
}
const unique = (values) => new Set(values).size === values.length
const sha = (text) => crypto.createHash('sha256').update(text).digest('hex')
const revision = atlas.metadata.sourceRevision
requireFact(/^[0-9a-f]{40}$/.test(revision), 'Atlas needs a full source commit SHA')
requireFact(
  tokens.metadata.sourceRevision === revision &&
    pages.metadata.revision === revision &&
    components.reference_sha === revision,
  'Source studies have different revisions',
)
requireFact(
  atlas.files.length === atlas.metadata.counts.sourceFiles &&
    unique(atlas.files.map((file) => file.path)),
  'Atlas file count or unique-path coverage is inconsistent',
)
requireFact(
  atlas.files.every((file) => file.parseErrors === 0 && file.analysis === 'static-typescript-ast'),
  'Atlas includes unparsed source',
)
requireFact(
  atlas.styles.length === atlas.metadata.counts.styleFiles,
  'Stylesheet coverage count is inconsistent',
)
const routePaths = atlas.files
  .filter((file) => file.role === 'page')
  .map((file) => file.path)
  .sort()
const pagePaths = pages.pages.map((page) => page.source_path).sort()
requireFact(
  JSON.stringify(routePaths) === JSON.stringify(pagePaths),
  'Detailed route study does not cover exactly the atlas page entries',
)
requireFact(
  unique(pagePaths) &&
    pagePaths.length === pages.metadata.total_page_files &&
    pagePaths.length === atlas.metadata.counts.pages,
  'Page counts or unique paths disagree',
)
requireFact(
  pages.pages.every((page) => page.reusable_rule && page.browser_verification),
  'A page lacks its rule or evidence limit',
)
requireFact(
  components.package.length === components.counts.public_subpaths &&
    components.package.length === atlas.exports.length &&
    unique(components.package.map((entry) => entry.subpath)),
  'Public component-family coverage is inconsistent',
)
requireFact(
  components.base.length === components.counts.base_families,
  'Application-base family coverage is inconsistent',
)
requireFact(
  tokens.tokens.length === atlas.metadata.counts.tokens &&
    unique(tokens.tokens.map((token) => token.name)),
  'Token catalog coverage is inconsistent',
)
requireFact(
  tokens.typography.length === atlas.metadata.counts.typographyUtilities,
  'Typography coverage is inconsistent',
)
requireFact(
  tokens.tokens.every(
    (token) => token.adoption && token.definitions && Array.isArray(token.directUsageFiles),
  ),
  'Token lacks adoption, definition or usage analysis',
)
requireFact(
  atlas.families.reduce((count, family) => count + family.files, 0) === atlas.files.length,
  'Source family partition is incomplete',
)

const excluded = new Set([
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
function walk(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      if (excluded.has(entry.name)) return []
      const target = path.join(dir, entry.name)
      return entry.isDirectory()
        ? walk(target)
        : entry.isFile() && !/\.(?:spec|test|stories)\.[cm]?[jt]sx?$/.test(entry.name)
          ? [target]
          : []
    })
}
const docs = [...walk(path.join(root, 'docs/engineering')), ...walk(path.join(root, 'packages/ui'))]
  .filter((file) => file.endsWith('.md'))
  .concat(
    [
      'AGENTS.md',
      'UI_DESIGN_GUIDELINES.md',
      'README.md',
      'docs/README.md',
      '.github/pull_request_template.md',
      '.claude/rules/frontend-ui.md',
    ].map((file) => path.join(root, file)),
  )
const exportGuide = read(path.join(root, 'docs/engineering/design-system.md'))
const tokenNames = new Set(tokens.tokens.map((token) => token.name))
const localStyleFiles = [
  'packages/ui/src/themes/light.css',
  'packages/ui/src/themes/dark.css',
  'packages/ui/src/styles/styles.css',
  ...['apps/web/styles', 'apps/cloud/app/styles'].flatMap((dir) =>
    walk(path.join(root, dir))
      .filter((file) => file.endsWith('.css'))
      .filter((file) =>
        [...read(file).matchAll(/(--[\w-]+)\s*:/g)].some((match) => tokenNames.has(match[1])),
      )
      .map((file) => path.relative(root, file).split(path.sep).join('/')),
  ),
].sort()
const localRecorded = tokens.metadata.localStylesheets || []
requireFact(
  JSON.stringify(localStyleFiles) === JSON.stringify(localRecorded.map((file) => file.path)),
  'Local token stylesheet inventory changed; regenerate token evidence',
)
for (const file of localRecorded)
  requireFact(
    fs.existsSync(path.join(root, file.path)) &&
      sha(read(path.join(root, file.path))) === file.sha256,
    `Local token evidence is stale: ${file.path}`,
  )
requireFact(
  JSON.stringify(components.package.map((entry) => entry.subpath).sort()) ===
    JSON.stringify(atlas.exports.map((entry) => entry.subpath).sort()) &&
    atlas.exports.every((entry) => entry.exists),
  'Reference export set does not match the component study',
)
const coverageText = read(path.join(study, 'source-coverage.md'))
const tokenText = read(path.join(study, 'token-reference.md'))
const typeText = read(path.join(study, 'typography-reference.md'))
const pageText = read(path.join(study, 'source-pages.md'))
requireFact(
  atlas.files.every((file) => coverageText.includes(file.path)),
  'Per-file Markdown source coverage is incomplete',
)
requireFact(
  tokens.tokens.every((token) => tokenText.includes(token.name)) &&
    tokens.typography.every((role) => typeText.includes(role.name)),
  'Human-readable token/typography coverage is incomplete',
)
requireFact(
  pages.pages.every((page) => pageText.includes(page.source_path)),
  'Human-readable route coverage is incomplete',
)
for (const [subpath, entry] of Object.entries(manifest.exports)) {
  requireFact(subpath !== '.', 'Package root barrel is not part of the component contract')
  const target = typeof entry === 'string' ? entry : entry.import || entry.default || entry.types
  requireFact(
    fs.existsSync(path.resolve(root, 'packages/ui', target)),
    `Export ${subpath} points to a missing source file`,
  )
  requireFact(
    exportGuide.includes(`@tapstate-web/ui/${subpath.slice(2)}`),
    `Local export ${subpath} is missing from the component guide`,
  )
}
for (const file of docs) {
  const rel = path.relative(root, file)
  const text = read(file)
  requireFact(
    !/(?:^|[\s`"'(])\/Users\/[\w.-]+\//m.test(text) &&
      !/\/home\/[\w.-]+\/\.(?:codex|claude|config)\//.test(text),
    `${rel} contains a personal absolute path`,
  )
  requireFact(
    !text.includes('ui-design-constraints.md'),
    `${rel} still routes to the retired constraint document`,
  )
  const withoutCode = text.replace(/```[\s\S]*?```/g, '')
  for (const match of withoutCode.matchAll(/(?<!!)\[[^\]]+\]\(([^\s)]+)\)/g)) {
    const target = match[1].replace(/^<|>$/g, '').split('#')[0]
    if (!target || /^(?:https?:|mailto:|data:|\/)/.test(target)) continue
    requireFact(
      fs.existsSync(path.resolve(path.dirname(file), decodeURIComponent(target))),
      `${rel} has broken relative link ${target}`,
    )
  }
  for (const match of text.matchAll(/@tapstate-web\/ui\/([a-z][a-z0-9.-]*)/g)) {
    requireFact(
      Object.hasOwn(manifest.exports, `./${match[1]}`),
      `${rel} names unsupported local UI subpath ${match[1]}`,
    )
  }
}

if (process.argv[2]) {
  const reference = path.resolve(process.argv[2])
  const actualRevision = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: reference,
    encoding: 'utf8',
  }).trim()
  requireFact(
    actualRevision === revision,
    'Reference checkout revision differs from the recorded study',
  )
  const packageRoot = fs
    .readdirSync(path.join(reference, 'packages'))
    .map((name) => path.join(reference, 'packages', name))
    .find((dir) => fs.existsSync(path.join(dir, 'src/themes/theme.css')))
  if (!packageRoot) throw new Error('Reference component package is unavailable')
  const sourceName = path.basename(packageRoot).replace(/-ui$/, '')
  const normalizePath = (file) =>
    path
      .relative(reference, file)
      .split(path.sep)
      .join('/')
      .replaceAll(
        path.relative(reference, packageRoot).split(path.sep).join('/'),
        'component-package',
      )
      .replace(new RegExp(`\\b${sourceName}\\b`, 'gi'), 'reference')
      .replaceAll(sourceName[0].toUpperCase() + sourceName.slice(1), 'Reference')
  const currentFiles = [
    ...walk(path.join(reference, 'web')),
    ...walk(path.join(packageRoot, 'src')),
  ].filter((file) => file.endsWith('.tsx'))
  const indexed = new Map(currentFiles.map((file) => [normalizePath(file), file]))
  requireFact(
    indexed.size === atlas.files.length && atlas.files.every((file) => indexed.has(file.path)),
    'Runtime source-file inventory has drifted',
  )
  for (const file of atlas.files) {
    const actual = indexed.get(file.path)
    if (actual)
      requireFact(sha(read(actual)) === file.sha256, `Reference source hash changed: ${file.path}`)
  }
  for (const file of atlas.styles) {
    const actual = file.path.startsWith('component-package/')
      ? path.join(packageRoot, file.path.slice('component-package/'.length))
      : path.join(reference, file.path)
    requireFact(
      fs.existsSync(actual) && sha(read(actual)) === file.sha256,
      `Reference stylesheet changed: ${file.path}`,
    )
  }
  const forbidden = new RegExp(`\\b${sourceName}\\b`, 'i')
  for (const file of docs)
    requireFact(
      !forbidden.test(read(file)),
      `${path.relative(root, file)} exposes the reference product name`,
    )
}
if (problems.length) {
  console.error(problems.map((problem) => `FAIL: ${problem}`).join('\n'))
  process.exitCode = 1
} else {
  console.log(
    `PASS: ${atlas.files.length} source files, ${routePaths.length} routes, ${components.package.length} reference subpaths, ${components.base.length} base families, ${tokens.tokens.length} custom properties, ${Object.keys(manifest.exports).length} local exports; ${docs.length} Markdown files checked${process.argv[2] ? '; reference revision and source hashes verified' : ''}. Static documentation evidence only.`,
  )
}
