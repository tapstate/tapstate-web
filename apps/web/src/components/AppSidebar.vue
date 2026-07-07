<script setup lang="ts">
import type { Component } from 'vue'
import { Database, GitMerge, MessageSquareText, Terminal } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

interface NavigationItem {
  labelKey: string
  to: string
  icon: Component
}

const route = useRoute()
const { t } = useI18n()

const navigation: NavigationItem[] = [
  { labelKey: 'nav.sources', to: '/sources', icon: Database },
  { labelKey: 'nav.pipelines', to: '/pipelines', icon: GitMerge },
  { labelKey: 'nav.explorations', to: '/explorations', icon: MessageSquareText },
]
</script>

<template>
  <aside class="app-sidebar">
    <div class="app-sidebar__brand">
      <div class="app-sidebar__mark" aria-hidden="true">
        <Terminal class="h-3 w-3 text-white" />
      </div>
      <span class="app-sidebar__title">{{ t('app.brand') }}</span>
    </div>

    <nav class="app-sidebar__nav" :aria-label="t('app.primaryNavigation')">
      <RouterLink
        v-for="item in navigation"
        :key="item.to"
        :to="item.to"
        class="app-sidebar__link"
        :class="{ 'app-sidebar__link--active': route.path.startsWith(item.to) }"
      >
        <component :is="item.icon" class="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{{ t(item.labelKey) }}</span>
      </RouterLink>
    </nav>
  </aside>
</template>
