import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const isAskTapstateOpen = ref(false)
  return { isAskTapstateOpen }
})
