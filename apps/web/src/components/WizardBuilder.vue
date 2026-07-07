<script setup lang="ts">
import {
  Braces,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CornerUpLeft,
  Database,
  Edit2,
  LayoutGrid,
  MessageSquare,
  Plus,
  Settings2,
  Table,
  Zap,
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const emit = defineEmits<{
  (event: 'back'): void
}>()

const { t } = useI18n()
const fields = ['_id', 'CITY', 'COUNTRY_CODE', 'CUSTOMER_ID', 'DATE_OF_BIRTH', 'DIRECT', 'EMAIL', 'FIRST_NAME', 'GENDER', 'JOB']
</script>

<template>
  <section class="flex h-full w-full flex-col bg-[#fafafa]">
    <header class="flex h-14 shrink-0 items-center border-b border-gray-200/70 bg-white px-4">
      <button class="mr-2 rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900" :aria-label="t('common.back')" @click="emit('back')">
        <ChevronLeft class="h-4 w-4" aria-hidden="true" />
      </button>
      <div class="flex min-w-0 items-center gap-2">
        <h1 class="truncate text-[14px] font-semibold text-gray-900">
          {{ t('wizard.title') }}
        </h1>
        <Edit2 class="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden="true" />
      </div>
    </header>

    <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 lg:flex-row">
      <main class="flex min-h-[460px] flex-1 flex-col items-center overflow-y-auto pb-20 pr-0 lg:pr-2">
        <article class="w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div class="mb-3 flex items-center justify-between">
            <div class="flex items-center gap-2 text-[14px] font-semibold text-gray-900">
              <Table class="h-4 w-4 text-gray-500" aria-hidden="true" />
              {{ t('wizard.sourceData') }}
            </div>
          </div>
          <button class="flex w-full items-center rounded-md border border-gray-200 bg-white p-2 text-[13px] transition-colors hover:border-gray-300">
            <span class="flex flex-1 items-center gap-2 text-gray-700">
              <Database class="h-3.5 w-3.5 text-blue-400" aria-hidden="true" />
              {{ t('wizard.sourceName') }}
            </span>
            <span class="flex items-center gap-1.5 border-l border-gray-200 pl-3 text-gray-600">
              {{ t('wizard.pickFields') }}
              <ChevronDown class="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </button>
        </article>

        <div class="relative my-2 flex h-10 w-px items-center justify-center border-l border-dashed border-gray-300 bg-gray-200">
          <button class="absolute z-10 flex h-6 w-6 items-center justify-center rounded-full border border-purple-200 bg-white text-purple-600 transition-colors hover:bg-purple-50" :aria-label="t('wizard.addStep')">
            <Plus class="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>

        <article class="group relative w-full max-w-2xl rounded-xl border border-dashed border-gray-300 bg-white p-4 shadow-sm">
          <div class="mb-4 flex items-center gap-2 text-[14px] font-semibold text-gray-900">
            <Settings2 class="h-4 w-4 text-gray-500" aria-hidden="true" />
            {{ t('wizard.rename.title') }}
          </div>

          <div class="overflow-hidden rounded-lg border border-gray-100">
            <table class="w-full min-w-[560px] text-left text-[13px]">
              <thead class="bg-gray-50/80 text-gray-600">
                <tr>
                  <th class="px-4 py-2 font-medium">
                    {{ t('wizard.rename.field') }}
                  </th>
                  <th class="px-4 py-2 font-medium">
                    {{ t('wizard.rename.newField') }}
                  </th>
                  <th class="px-4 py-2 text-right font-medium">
                    {{ t('wizard.rename.transform') }}
                  </th>
                  <th class="w-10 px-4 py-2">
                    <span class="sr-only">{{ t('common.actions') }}</span>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="field in fields" :key="field">
                  <td class="flex items-center gap-1.5 px-4 py-2 text-gray-700">
                    <ChevronRight v-if="field === 'DIRECT'" class="h-3 w-3 text-gray-400" aria-hidden="true" />
                    {{ field }}
                  </td>
                  <td class="px-4 py-2 text-gray-700">
                    {{ field }}
                  </td>
                  <td class="px-4 py-2" />
                  <td class="px-4 py-2 text-right">
                    <button class="text-gray-400 hover:text-gray-600" :aria-label="t('wizard.rename.revert')">
                      <CornerUpLeft class="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <div class="relative my-2 flex h-10 w-px items-center justify-center border-l border-dashed border-gray-300 bg-gray-200">
          <button class="absolute z-10 flex h-6 w-6 items-center justify-center rounded-full border border-red-200 bg-white text-red-500 transition-colors hover:bg-red-50" :aria-label="t('wizard.addOutput')">
            <Plus class="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>

        <div class="mt-4 flex w-full max-w-2xl flex-wrap items-center justify-center gap-4">
          <button class="flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-4 py-2 text-[13px] font-medium text-indigo-700 shadow-sm transition-colors hover:bg-indigo-50">
            <Table class="h-4 w-4" aria-hidden="true" />
            {{ t('wizard.createView') }}
          </button>
          <span class="text-[13px] text-gray-400">{{ t('wizard.or') }}</span>
          <button class="flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-4 py-2 text-[13px] font-medium text-emerald-700 shadow-sm transition-colors hover:bg-emerald-50">
            <Zap class="h-4 w-4" aria-hidden="true" />
            {{ t('wizard.publishApi') }}
          </button>
        </div>
      </main>

      <aside class="flex min-h-[320px] w-full shrink-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm lg:w-[45%]">
        <div class="flex h-12 shrink-0 items-center justify-between border-b border-gray-100 px-4">
          <h2 class="text-[13px] font-medium text-gray-900">
            {{ t('wizard.preview.title') }}
          </h2>
          <div class="flex overflow-hidden rounded-md border border-gray-200">
            <button class="border-r border-gray-200 bg-white px-2 py-1 text-gray-600 hover:bg-gray-50" :aria-label="t('wizard.preview.json')">
              <Braces class="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button class="bg-gray-100 px-2 py-1 text-gray-900" :aria-label="t('wizard.preview.grid')">
              <LayoutGrid class="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div class="flex flex-1 flex-col items-center justify-center p-8 text-center text-gray-400">
          <div class="relative mb-4">
            <div class="flex h-16 w-16 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 shadow-sm">
              <Database class="h-8 w-8 text-gray-300" aria-hidden="true" />
            </div>
            <div class="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-gray-100 bg-white shadow-sm">
              <MessageSquare class="h-3 w-3 text-gray-300" aria-hidden="true" />
            </div>
          </div>
          <p class="text-[13px]">
            {{ t('wizard.preview.empty') }}
          </p>
        </div>
      </aside>
    </div>
  </section>
</template>
