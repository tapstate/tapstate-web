import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const isAskCyntexOpen = ref(false)
  return { isAskCyntexOpen }
})
