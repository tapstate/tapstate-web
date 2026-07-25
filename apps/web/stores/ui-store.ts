import { create } from 'zustand'

interface UiState {
  isAskTapstateOpen: boolean
  setAskTapstateOpen: (open: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  isAskTapstateOpen: false,
  setAskTapstateOpen: (open) => set({ isAskTapstateOpen: open }),
}))
