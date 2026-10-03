// Transient UI state shared across rooms (not persisted).

import { create } from 'zustand'

interface UiState {
  askAiOpen: boolean
  isThinking: boolean
  /** Text for the polite live region (room arrivals, "cost updated", ...). */
  announcement: string
  openAskAi: () => void
  closeAskAi: () => void
  setThinking: (isThinking: boolean) => void
}

export const useUiStore = create<UiState>()((set) => ({
  askAiOpen: false,
  isThinking: false,
  announcement: '',
  openAskAi: () => set({ askAiOpen: true }),
  closeAskAi: () => set({ askAiOpen: false }),
  setThinking: (isThinking) => set({ isThinking }),
}))

let pending: ReturnType<typeof setTimeout> | undefined

/**
 * Says a short status message to screen readers. The region is cleared first,
 * so repeating the same message is still announced.
 */
export function announce(message: string) {
  clearTimeout(pending)
  useUiStore.setState({ announcement: '' })
  pending = setTimeout(() => useUiStore.setState({ announcement: message }), 60)
}
