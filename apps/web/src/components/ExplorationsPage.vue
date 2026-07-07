<script setup lang="ts">
import type { Component } from 'vue'
import {
  ArrowUp,
  AtSign,
  GitMerge,
  History,
  Lightbulb,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  Wrench,
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

interface Capability {
  titleKey: string
  bodyKey?: string
  itemKeys: string[]
  icon: Component
  iconClass: string
}

const { t } = useI18n()

const historyItems = [
  { id: 'capabilities', labelKey: 'explorations.history.capabilities', active: true },
  { id: 'trip-trends', labelKey: 'explorations.history.tripTrends', active: false },
  { id: 'tip-zones', labelKey: 'explorations.history.tipZones', active: false },
]

const capabilities: Capability[] = [
  {
    titleKey: 'explorations.capabilities.explore.title',
    itemKeys: [
      'explorations.capabilities.explore.item1',
      'explorations.capabilities.explore.item2',
      'explorations.capabilities.explore.item3',
    ],
    icon: Search,
    iconClass: 'text-blue-500',
  },
  {
    titleKey: 'explorations.capabilities.nodes.title',
    itemKeys: [
      'explorations.capabilities.nodes.item1',
      'explorations.capabilities.nodes.item2',
      'explorations.capabilities.nodes.item3',
    ],
    icon: GitMerge,
    iconClass: 'text-purple-500',
  },
  {
    titleKey: 'explorations.capabilities.resources.title',
    bodyKey: 'explorations.capabilities.resources.body',
    itemKeys: [
      'explorations.capabilities.resources.item1',
      'explorations.capabilities.resources.item2',
    ],
    icon: Wrench,
    iconClass: 'text-gray-500',
  },
  {
    titleKey: 'explorations.capabilities.examples.title',
    bodyKey: 'explorations.capabilities.examples.body',
    itemKeys: [
      'explorations.capabilities.examples.item1',
      'explorations.capabilities.examples.item2',
      'explorations.capabilities.examples.item3',
    ],
    icon: Lightbulb,
    iconClass: 'text-amber-500',
  },
]
</script>

<template>
  <section class="flex h-full w-full flex-col overflow-hidden bg-white md:flex-row">
    <aside class="flex w-full shrink-0 flex-col border-b border-gray-100/70 bg-[#fcfcfd]/80 md:w-64 md:border-b-0 md:border-r">
      <div class="flex items-center justify-between border-b border-gray-100/70 p-3">
        <h2 class="flex items-center gap-2 text-[13px] font-semibold text-gray-900">
          <History class="h-4 w-4 text-gray-500" aria-hidden="true" />
          {{ t('explorations.title') }}
        </h2>
        <button class="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100" :aria-label="t('explorations.actions.new')">
          <Plus class="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div class="min-h-[130px] flex-1 overflow-auto p-2">
        <button
          v-for="item in historyItems"
          :key="item.id"
          type="button"
          class="group mb-1 flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition-colors"
          :class="item.active ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'"
        >
          <span class="truncate pr-2 text-[13px]" :class="{ 'font-medium': item.active }">{{ t(item.labelKey) }}</span>
          <MoreHorizontal class="h-3.5 w-3.5 shrink-0 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
        </button>
      </div>
    </aside>

    <main class="flex min-w-0 flex-1 flex-col bg-white">
      <header class="flex h-14 shrink-0 items-center justify-between border-b border-gray-100/80 px-4 md:px-6">
        <div class="flex min-w-0 items-center gap-3">
          <div class="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-purple-100">
            <Sparkles class="h-3.5 w-3.5 text-purple-600" aria-hidden="true" />
          </div>
          <h1 class="truncate text-[15px] font-semibold text-gray-900">
            {{ t('explorations.threadTitle') }}
          </h1>
        </div>
      </header>

      <div class="flex flex-1 justify-center overflow-y-auto p-4 md:p-10">
        <div class="flex w-full max-w-3xl flex-col gap-6">
          <div class="flex justify-end">
            <div class="max-w-[80%] rounded-2xl rounded-tr-sm bg-gray-100 px-4 py-2.5 text-[14px] text-gray-900">
              {{ t('explorations.messages.userQuestion') }}
            </div>
          </div>

          <div class="flex justify-start">
            <div class="max-w-[88%] space-y-4 text-[14px] leading-relaxed text-gray-900">
              <p>{{ t('explorations.messages.answerIntro') }}</p>

              <section v-for="capability in capabilities" :key="capability.titleKey" class="space-y-1">
                <h4 class="flex items-center gap-1.5 font-semibold">
                  <component :is="capability.icon" class="h-4 w-4" :class="[capability.iconClass]" aria-hidden="true" />
                  {{ t(capability.titleKey) }}
                </h4>
                <p v-if="capability.bodyKey" class="text-gray-700">
                  {{ t(capability.bodyKey) }}
                </p>
                <ul class="list-disc space-y-1 pl-5 text-gray-700">
                  <li v-for="itemKey in capability.itemKeys" :key="itemKey">
                    {{ t(itemKey) }}
                  </li>
                </ul>
              </section>

              <p>{{ t('explorations.messages.answerClose') }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="flex shrink-0 justify-center p-4 pt-0 md:p-6 md:pt-0">
        <div class="w-full max-w-3xl">
          <div class="relative flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all focus-within:border-gray-400 focus-within:ring-1 focus-within:ring-gray-400">
            <textarea
              rows="1"
              class="max-h-[200px] min-h-[56px] w-full resize-none bg-transparent px-4 py-4 text-[14px] text-gray-900 outline-none placeholder:text-gray-400"
              :placeholder="t('explorations.input.placeholder')"
            />

            <div class="flex items-center justify-end bg-white px-2 py-2">
              <div class="flex items-center gap-2">
                <button class="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600" :aria-label="t('explorations.actions.mention')">
                  <AtSign class="h-4 w-4" aria-hidden="true" />
                </button>
                <button class="mr-1 flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-lg bg-gray-100 text-gray-400 transition-colors" :aria-label="t('explorations.actions.send')" disabled>
                  <ArrowUp class="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </section>
</template>
