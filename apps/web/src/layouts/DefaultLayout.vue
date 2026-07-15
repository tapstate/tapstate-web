<script setup lang="ts">
import { ElConfigProvider } from 'element-plus'
import elEn from 'element-plus/es/locale/lang/en'
import elZhCn from 'element-plus/es/locale/lang/zh-cn'
import elZhTw from 'element-plus/es/locale/lang/zh-tw'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AppHeader from '@/components/AppHeader.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import AskTapstate from '@/components/AskTapstate.vue'

const { locale } = useI18n()

const ELEMENT_LOCALES = { 'en': elEn, 'zh-CN': elZhCn, 'zh-TW': elZhTw } as const
const elLocale = computed(
  () => ELEMENT_LOCALES[locale.value as keyof typeof ELEMENT_LOCALES] ?? elEn,
)
</script>

<template>
  <div class="default-layout-root">
    <ElConfigProvider :locale="elLocale">
      <div class="app-shell">
        <div class="app-shell__wash" aria-hidden="true" />
        <AppSidebar />

        <div class="app-shell__body">
          <AppHeader />

          <main class="app-shell__main">
            <div class="app-shell__panel">
              <RouterView />
            </div>
          </main>
        </div>

        <AskTapstate />
      </div>
    </ElConfigProvider>
  </div>
</template>

<style scoped>
.default-layout-root {
  width: 100%;
  height: 100%;
}
</style>
