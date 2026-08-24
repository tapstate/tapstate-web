import { ChevronDown, ChevronRight, GitMerge, Table, Zap } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import type { TreeNode } from './types'

interface TreeItemProps {
  node: TreeNode
  level?: number
  expandedIds: Set<string>
  selectedId: string | null
  onToggle: (id: string) => void
  onSelect: (id: string) => void
}

export function TreeItem({
  node,
  level = 0,
  expandedIds,
  selectedId,
  onToggle,
  onSelect,
}: TreeItemProps) {
  const { t } = useTranslation()
  const isExpanded = expandedIds.has(node.id)
  const isSelected = selectedId === node.id
  const hasChildren = Boolean(node.children?.length)

  return (
    <div>
      <div
        className={cn(
          'flex items-center rounded-lg px-2 py-1.5 text-[13px] transition-colors select-none',
          isSelected
            ? 'bg-gray-900/5 font-medium text-gray-900'
            : 'text-gray-600 hover:bg-gray-900/5',
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {hasChildren ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-gray-400 hover:text-gray-600"
            aria-label={t(
              isExpanded ? 'pipelines.actions.collapseNode' : 'pipelines.actions.expandNode',
              { name: node.name },
            )}
            onClick={(event) => {
              event.stopPropagation()
              onToggle(node.id)
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
            )}
          </Button>
        ) : (
          <span className="w-4" aria-hidden="true" />
        )}
        <Button
          variant="ghost"
          className="ml-1 h-auto min-w-0 flex-1 justify-start px-0 text-left"
          type="button"
          aria-pressed={isSelected}
          onClick={() => onSelect(node.id)}
        >
          <span className="mr-1.5">
            {node.type === 'pipeline' ? (
              <GitMerge className="h-3.5 w-3.5 text-blue-500" />
            ) : node.type === 'view' ? (
              <Table className="h-3.5 w-3.5 text-indigo-500" />
            ) : (
              <Zap className="h-3.5 w-3.5 text-emerald-500" />
            )}
          </span>
          <span className="flex-1 truncate">{node.name}</span>
          {node.status === 'running' && (
            <span className="ml-2 h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.5)]" />
          )}
          {node.status === 'paused' && (
            <span className="ml-2 h-1.5 w-1.5 rounded-full bg-yellow-500 shadow-[0_0_4px_rgba(234,179,8,0.5)]" />
          )}
        </Button>
      </div>

      {isExpanded && hasChildren && (
        <div className="mt-0.5">
          {node.children?.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              level={level + 1}
              expandedIds={expandedIds}
              selectedId={selectedId}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}
