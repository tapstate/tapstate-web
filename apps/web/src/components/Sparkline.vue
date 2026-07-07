<script setup lang="ts">
defineProps<{
  active: boolean
}>()
</script>

<template>
  <svg v-if="active" class="w-16 h-4 text-indigo-500" viewBox="0 0 100 20" preserveAspectRatio="none">
    <path
      d="M0,15 L10,12 L20,18 L30,5 L40,15 L50,8 L60,18 L70,12 L80,16 L90,2 L100,10"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>
