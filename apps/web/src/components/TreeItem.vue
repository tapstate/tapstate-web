<script setup lang="ts">
import type { TreeNode } from './PipelinesPage.vue'
import { ChevronDown, ChevronRight, GitMerge, Table, Zap } from 'lucide-vue-next'
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  node: TreeNode
  level?: number
  expandedIds: Set<string>
  selectedId: string | null
}>(), {
  level: 0,
})

defineEmits<{
  (e: 'toggle', id: string): void
  (e: 'select', id: string): void
}>()

const isExpanded = computed(() => props.expandedIds.has(props.node.id))
const isSelected = computed(() => props.selectedId === props.node.id)
const hasChildren = computed(() => !!props.node.children && props.node.children.length > 0)
</script>

<template>
  <div>
    <div
      class="flex items-center py-1.5 px-2 rounded-[var(--radius-sm)] cursor-pointer text-[13px] select-none transition-colors" :class="[
        isSelected ? 'bg-gray-900/5 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-900/5',
      ]"
      :style="{ paddingLeft: `${level * 12 + 8}px` }"
      @click="$emit('select', node.id)"
    >
      <button
        class="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600"
        @click.stop="hasChildren && $emit('toggle', node.id)"
      >
        <template v-if="hasChildren">
          <ChevronDown v-if="isExpanded" class="h-3 w-3" />
          <ChevronRight v-else class="h-3 w-3" />
        </template>
        <span v-else class="w-3" />
      </button>
      <span class="mr-1.5">
        <GitMerge v-if="node.type === 'pipeline'" class="h-3.5 w-3.5 text-blue-500" />
        <Table v-else-if="node.type === 'view'" class="h-3.5 w-3.5 text-indigo-500" />
        <Zap v-else class="h-3.5 w-3.5 text-emerald-500" />
      </span>
      <span class="truncate flex-1">{{ node.name }}</span>
      <span v-if="node.status === 'running'" class="w-1.5 h-1.5 rounded-full bg-green-500 ml-2 shadow-[0_0_4px_rgba(34,197,94,0.5)]" />
      <span v-if="node.status === 'paused'" class="w-1.5 h-1.5 rounded-full bg-yellow-500 ml-2 shadow-[0_0_4px_rgba(234,179,8,0.5)]" />
    </div>

    <div v-if="isExpanded && hasChildren" class="mt-0.5">
      <TreeItem
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :level="level + 1"
        :expanded-ids="expandedIds"
        :selected-id="selectedId"
        @toggle="$emit('toggle', $event)"
        @select="$emit('select', $event)"
      />
    </div>
  </div>
</template>
