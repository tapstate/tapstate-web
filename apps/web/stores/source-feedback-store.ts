import { create } from 'zustand'

interface SourceFeedbackState {
  successMessage: string
  setSuccessMessage: (message: string) => void
  takeSuccessMessage: (message: string) => boolean
}

export const useSourceFeedbackStore = create<SourceFeedbackState>((set) => ({
  successMessage: '',
  setSuccessMessage: (successMessage) => set({ successMessage }),
  takeSuccessMessage: (message) => {
    let taken = false
    set((state) => {
      if (!message || state.successMessage !== message) return state
      taken = true
      return { successMessage: '' }
    })
    return taken
  },
}))
