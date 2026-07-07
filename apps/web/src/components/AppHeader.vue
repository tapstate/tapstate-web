<script setup lang="ts">
import type { AppLocale } from '@/i18n'
import { Bell, Languages, Sparkles } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { SUPPORTED_LOCALES } from '@/i18n'
import { useUiStore } from '@/stores/uiState'

const uiStore = useUiStore()
const { t, locale } = useI18n()
const localeOptions = SUPPORTED_LOCALES

function switchLocale(nextLocale: AppLocale) {
  locale.value = nextLocale
}
</script>

<template>
  <header class="app-header">
    <div class="app-header__context" />

    <div class="app-header__actions">
      <button
        type="button"
        class="app-header__ask"
        @click="uiStore.isAskCyntexOpen = true"
      >
        <Sparkles class="h-3.5 w-3.5" aria-hidden="true" />
        <span>{{ t('ask.launch') }}</span>
        <kbd>{{ t('app.shortcuts.ask') }}</kbd>
      </button>

      <ElDropdown trigger="click" @command="switchLocale">
        <button type="button" class="app-header__icon-button" :aria-label="t('app.language')">
          <Languages class="h-4 w-4" aria-hidden="true" />
        </button>
        <template #dropdown>
          <ElDropdownMenu>
            <ElDropdownItem
              v-for="item in localeOptions"
              :key="item"
              :command="item"
              :disabled="locale === item"
            >
              {{ t(`app.languageOptions.${item}`) }}
            </ElDropdownItem>
          </ElDropdownMenu>
        </template>
      </ElDropdown>

      <button type="button" class="app-header__icon-button" :aria-label="t('app.notifications')">
        <Bell class="h-4 w-4" aria-hidden="true" />
      </button>

      <div class="app-header__avatar" :aria-label="t('app.user.avatar')">
        {{ t('app.user.initial') }}
      </div>
    </div>
  </header>
</template>
