import type { ComponentType, SVGProps } from 'react'

import {
  Activity,
  Braces,
  ChevronDown,
  Clock,
  Database,
  GitMerge,
  LayoutTemplate,
  MoreHorizontal,
  Network,
  Plus,
  Sparkles,
  Table,
  Zap,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

import type { NodeStatus, TreeNode, TreeNodeType } from './types'

import { TreeItem } from './tree-item'
import { WizardBuilder } from './wizard-builder'

const treeData: TreeNode[] = [
  {
    id: 'p1',
    name: 'User Data Sync',
    type: 'pipeline',
    status: 'running',
    children: [
      { id: 'v1', name: 'Active Users View', type: 'view' },
      { id: 'v2', name: 'Premium Users View', type: 'view' },
      { id: 'a1', name: 'User Profile API', type: 'api', status: 'running' },
    ],
  },
  {
    id: 'p2',
    name: 'Order Analytics',
    type: 'pipeline',
    status: 'paused',
    children: [
      { id: 'v3', name: 'Daily Revenue', type: 'view' },
      { id: 'a2', name: 'Orders GraphQL', type: 'api', status: 'paused' },
    ],
  },
]

const schemaFields = [
  { name: 'id', type: 'UUID', descriptionKey: 'pipelines.schema.idDescription' },
  {
    name: 'created_at',
    type: 'TIMESTAMP',
    descriptionKey: 'pipelines.schema.createdAtDescription',
  },
  { name: 'event_name', type: 'VARCHAR', descriptionKey: 'pipelines.schema.eventNameDescription' },
]

const previewRows = [
  { id: 'a1b2c3d4...', createdAt: '2026-06-29 10:00:00', eventName: 'page_view' },
  { id: 'e5f6g7h8...', createdAt: '2026-06-29 10:05:12', eventName: 'button_click' },
]

const apiEndpoint = 'https://api.tapstate.dev/v1/user_profile'
const responsePreview = `{
  "data": [
    {
      "id": "usr_9a8b7c6d",
      "email": "user@example.com",
      "created_at": "2026-01-15T08:30:00Z"
    }
  ],
  "meta": {
    "total_count": 1,
    "latency_ms": 42
  }
}`

function nodeIcon(type: TreeNodeType): ComponentType<SVGProps<SVGSVGElement>> {
  if (type === 'view') return Table
  if (type === 'api') return Zap
  return GitMerge
}

function nodeIconColor(type: TreeNodeType) {
  if (type === 'view') return 'text-indigo-500'
  if (type === 'api') return 'text-emerald-500'
  return 'text-blue-500'
}

function nodeTypeLabelKey(type: TreeNodeType) {
  if (type === 'view') return 'pipelines.type.view'
  if (type === 'api') return 'pipelines.type.api'
  return 'pipelines.type.pipeline'
}

function statusLabelKey(status: NodeStatus) {
  if (status === 'paused') return 'pipelines.status.paused'
  if (status === 'error') return 'pipelines.status.error'
  return 'pipelines.status.running'
}

function statusDotClass(status: NodeStatus) {
  if (status === 'paused') return 'bg-yellow-500'
  if (status === 'error') return 'bg-red-500'
  return 'bg-green-500'
}

function statusClass(status: NodeStatus) {
  if (status === 'paused') return 'bg-yellow-50 text-yellow-800 ring-yellow-600/20'
  if (status === 'error') return 'bg-red-50 text-red-700 ring-red-600/20'
  return 'bg-green-50 text-green-700 ring-green-600/20'
}

export function PipelinesPage() {
  const { t } = useTranslation()
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['p1', 'p2']))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creationMode, setCreationMode] = useState<'wizard' | null>(null)

  const selectedNode = useMemo(() => {
    if (!selectedId) return null
    return (
      treeData.find((node) => node.id === selectedId) ??
      treeData.flatMap((node) => node.children ?? []).find((node) => node.id === selectedId) ??
      null
    )
  }, [selectedId])
  const displayItems = selectedNode?.children ?? treeData

  const createModes: Array<{
    value: 'wizard' | 'sql' | 'dag' | 'ai'
    labelKey: string
    descriptionKey: string
    icon: ComponentType<SVGProps<SVGSVGElement>>
    iconClass: string
  }> = [
    {
      value: 'wizard',
      labelKey: 'pipelines.createMenu.wizard',
      descriptionKey: 'pipelines.createMenu.wizardDescription',
      icon: LayoutTemplate,
      iconClass: 'bg-gray-100 text-gray-600 group-hover:bg-gray-200',
    },
    {
      value: 'sql',
      labelKey: 'pipelines.createMenu.sql',
      descriptionKey: 'pipelines.createMenu.sqlDescription',
      icon: Database,
      iconClass: 'bg-blue-50 text-blue-600 group-hover:bg-blue-100',
    },
    {
      value: 'dag',
      labelKey: 'pipelines.createMenu.dag',
      descriptionKey: 'pipelines.createMenu.dagDescription',
      icon: Network,
      iconClass: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100',
    },
    {
      value: 'ai',
      labelKey: 'pipelines.createMenu.ai',
      descriptionKey: 'pipelines.createMenu.aiDescription',
      icon: Sparkles,
      iconClass: 'bg-purple-50 text-purple-600 group-hover:bg-purple-100',
    },
  ]

  function toggleExpand(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (creationMode === 'wizard') return <WizardBuilder onBack={() => setCreationMode(null)} />

  return (
    <section className="flex h-full w-full flex-col overflow-hidden bg-white">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-gray-100/70 px-4 md:px-6">
        <h1 className="min-w-0 truncate text-[15px] font-semibold text-gray-900">
          {t('pipelines.title')}
        </h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-gray-800"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              {t('common.create')}
              <ChevronDown className="-mr-1 ml-0.5 h-3.5 w-3.5 opacity-70" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-72 border-gray-200/70 p-1.5 shadow-[0_12px_40px_rgba(15,23,42,0.12)]"
          >
            <DropdownMenuLabel>{t('pipelines.createMenu.title')}</DropdownMenuLabel>
            {createModes.map((mode) => {
              const Icon = mode.icon
              return (
                <DropdownMenuItem
                  key={mode.labelKey}
                  className="group items-start gap-3 px-3 py-2"
                  onSelect={() => {
                    if (mode.value === 'wizard') setCreationMode('wizard')
                  }}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors',
                      mode.iconClass,
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-gray-900">
                      {t(mode.labelKey)}
                    </span>
                    <span className="block text-[11px] text-gray-500">
                      {t(mode.descriptionKey)}
                    </span>
                  </span>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="flex min-h-0 flex-1 flex-col bg-white md:flex-row">
        <aside className="flex w-full shrink-0 flex-col border-b border-gray-100/70 bg-[#fcfcfd]/80 md:w-64 md:border-b-0 md:border-r">
          <div className="flex items-center justify-between border-b border-gray-100/70 p-3">
            <h2 className="ml-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              {t('pipelines.explorer')}
            </h2>
          </div>
          <div className="flex min-h-[160px] flex-1 gap-1 overflow-auto p-2 md:flex-col">
            <button
              type="button"
              className={cn(
                'flex min-w-[160px] items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors md:min-w-0',
                selectedId === null
                  ? 'bg-gray-100 font-medium text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50',
              )}
              onClick={() => setSelectedId(null)}
            >
              <GitMerge className="h-4 w-4 text-gray-400" aria-hidden="true" />
              <span>{t('pipelines.allPipelines')}</span>
            </button>
            {treeData.map((node) => (
              <TreeItem
                key={node.id}
                node={node}
                expandedIds={expandedIds}
                selectedId={selectedId}
                onToggle={toggleExpand}
                onSelect={setSelectedId}
              />
            ))}
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col bg-white">
          {selectedNode && <ResourceHeader node={selectedNode} />}
          <div className="min-h-0 flex-1 overflow-auto bg-white p-4 md:p-6">
            {!selectedNode || selectedNode.type === 'pipeline' ? (
              <ResourceTable items={displayItems} />
            ) : selectedNode.type === 'view' ? (
              <ViewDetails />
            ) : (
              <ApiDetails />
            )}
          </div>
        </main>
      </div>
    </section>
  )

  function ResourceHeader({ node }: { node: TreeNode }) {
    const Icon = nodeIcon(node.type)
    return (
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-100/70 px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className={cn('h-4 w-4 shrink-0', nodeIconColor(node.type))} aria-hidden="true" />
          <h2 className="truncate text-[14px] font-semibold text-gray-900">{node.name}</h2>
          {node.status && <span className="text-gray-200">{t('common.separator')}</span>}
          {node.status && (
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset',
                statusClass(node.status),
              )}
            >
              <span
                className={cn('h-1 w-1 rounded-full', statusDotClass(node.status))}
                aria-hidden="true"
              />
              {t(statusLabelKey(node.status))}
            </span>
          )}
        </div>
      </div>
    )
  }

  function ResourceTable({ items }: { items: TreeNode[] }) {
    return (
      <div className="overflow-hidden rounded-lg border border-gray-200/70">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead className="border-b border-gray-200/70 bg-gray-50/70 text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">{t('pipelines.table.resourceName')}</th>
                <th className="px-4 py-3 font-medium">{t('pipelines.table.type')}</th>
                <th className="px-4 py-3 font-medium">{t('pipelines.table.status')}</th>
                <th className="px-4 py-3 font-medium">{t('pipelines.table.modified')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100/70">
              {items.map((child) => {
                const Icon = nodeIcon(child.type)
                return (
                  <tr key={child.id} className="group transition-colors hover:bg-gray-50/70">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-6 w-6 items-center justify-center rounded-lg border border-gray-200/70 bg-gray-50">
                          <Icon
                            className={cn('h-3.5 w-3.5', nodeIconColor(child.type))}
                            aria-hidden="true"
                          />
                        </div>
                        <span className="font-medium text-gray-900">{child.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{t(nodeTypeLabelKey(child.type))}</td>
                    <td className="px-4 py-3">
                      {child.status ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg px-1.5 py-0.5 text-[11px] font-medium text-gray-600">
                          <span
                            className={cn('h-1.5 w-1.5 rounded-full', statusDotClass(child.status))}
                            aria-hidden="true"
                          />
                          {t(statusLabelKey(child.status))}
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-gray-500">
                          {t('pipelines.status.ready')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('pipelines.modified.twoHoursAgo')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        className="rounded-md p-1 text-gray-400 opacity-0 transition-colors hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100"
                        type="button"
                        aria-label={t('common.more')}
                      >
                        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  function ViewDetails() {
    const metrics = [
      { labelKey: 'pipelines.metrics.totalRows', value: '1,234,567', icon: Table },
      { labelKey: 'pipelines.metrics.storageSize', value: '456 MB', icon: Database },
      { labelKey: 'pipelines.metrics.delay', value: '12 ms', icon: Clock },
    ]
    return (
      <div className="max-w-4xl space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {metrics.map((metric) => {
            const Icon = metric.icon
            return (
              <article
                key={metric.labelKey}
                className="rounded-[var(--radius)] border border-gray-100/70 bg-gray-50/40 p-4"
              >
                <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-gray-500">
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {t(metric.labelKey)}
                </div>
                <div className="text-2xl font-semibold text-gray-900">{metric.value}</div>
              </article>
            )
          })}
        </div>
        <section>
          <h3 className="mb-3 text-[13px] font-semibold text-gray-900">
            {t('pipelines.schema.title')}
          </h3>
          <div className="overflow-hidden rounded-lg border border-gray-200/70">
            <table className="w-full min-w-[540px] text-left text-[13px]">
              <thead className="border-b border-gray-200/70 bg-gray-50/70 text-gray-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">{t('pipelines.schema.column')}</th>
                  <th className="px-4 py-2.5 font-medium">{t('pipelines.schema.type')}</th>
                  <th className="px-4 py-2.5 font-medium">{t('pipelines.schema.description')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/70">
                {schemaFields.map((field) => (
                  <tr key={field.name}>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{field.name}</td>
                    <td className="px-4 py-2.5">
                      <span className="rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-[11px] text-indigo-600">
                        {field.type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">{t(field.descriptionKey)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section>
          <h3 className="mb-3 text-[13px] font-semibold text-gray-900">
            {t('pipelines.preview.title')}
          </h3>
          <div className="overflow-hidden rounded-lg border border-gray-200/70">
            <table className="w-full min-w-[520px] whitespace-nowrap text-left text-[13px]">
              <thead className="border-b border-gray-200/70 bg-gray-50/70 text-gray-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">{t('pipelines.preview.id')}</th>
                  <th className="px-4 py-2.5 font-medium">{t('pipelines.preview.createdAt')}</th>
                  <th className="px-4 py-2.5 font-medium">{t('pipelines.preview.eventName')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/70 font-mono text-[12px] text-gray-600">
                {previewRows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-2 text-gray-400">{row.id}</td>
                    <td className="px-4 py-2">{row.createdAt}</td>
                    <td className="px-4 py-2 text-gray-900">{row.eventName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    )
  }

  function ApiDetails() {
    const metrics = [
      { labelKey: 'pipelines.metrics.requests', value: '892', icon: Activity },
      { labelKey: 'pipelines.metrics.latency', value: '45 ms', icon: Clock },
    ]
    return (
      <div className="max-w-4xl space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          {metrics.map((metric) => {
            const Icon = metric.icon
            return (
              <article
                key={metric.labelKey}
                className="rounded-[var(--radius)] border border-gray-100/70 bg-gray-50/40 p-4"
              >
                <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-gray-500">
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {t(metric.labelKey)}
                </div>
                <div className="text-2xl font-semibold text-gray-900">{metric.value}</div>
              </article>
            )
          })}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="space-y-3">
            <h3 className="text-[13px] font-semibold text-gray-900">
              {t('pipelines.api.endpoint')}
            </h3>
            <div className="flex items-center gap-2 rounded-md border border-gray-200/70 bg-gray-50/60 p-2.5">
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-bold text-emerald-600">
                {t('pipelines.api.method')}
              </span>
              <code className="truncate font-mono text-[12px] text-gray-700">{apiEndpoint}</code>
            </div>
          </section>
          <section className="space-y-3">
            <h3 className="text-[13px] font-semibold text-gray-900">{t('pipelines.api.auth')}</h3>
            <div className="rounded-md border border-gray-200/70 bg-gray-50/60 p-2.5 text-[12px] text-gray-600">
              {t('pipelines.api.authBody')}
            </div>
          </section>
        </div>
        <section>
          <h3 className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-gray-900">
            <Braces className="h-4 w-4 text-gray-400" aria-hidden="true" />
            {t('pipelines.api.responsePreview')}
          </h3>
          <pre className="overflow-x-auto rounded-lg bg-[#1e1e1e] p-4 font-mono text-[12px] leading-relaxed text-gray-300 shadow-sm">
            {responsePreview}
          </pre>
        </section>
      </div>
    )
  }
}
