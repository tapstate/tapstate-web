import { create } from 'zustand'

interface SourceFeedbackState {
  successMessage: string
  setSuccessMessage: (message: string) => void
}

export const useSourceFeedbackStore = create<SourceFeedbackState>((set) => ({
  successMessage: '',
  setSuccessMessage: (successMessage) => set({ successMessage }),
}))
