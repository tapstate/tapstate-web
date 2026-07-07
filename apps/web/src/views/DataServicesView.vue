<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <section class="view">
    <h1>{{ t('view.services.title') }}</h1>
    <p>{{ t('view.services.placeholder') }}</p>
  </section>
</template>
