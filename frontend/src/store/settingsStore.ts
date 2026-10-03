// Display preferences. Unlike the session, these hold no plan data, so they
// live in localStorage and survive a new tab.

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { useReducedMotion } from '../a11y/useReducedMotion'
import { hasWebGL } from '../a11y/webgl'

/** Immersive: pages float over the 3D office. Traditional: the same pages, no 3D, solid panels, no motion. */
export type ViewMode = 'immersive' | 'traditional'

interface SettingsState {
  /** null = automatic (traditional when reduced motion is on or WebGL is missing). */
  viewMode: ViewMode | null
  setViewMode: (mode: ViewMode) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      viewMode: null,
      setViewMode: (viewMode) => set({ viewMode }),
    }),
    {
      name: 'molarity-settings',
      version: 1,
      storage: createJSONStorage(() => localStorage),
    },
  ),
)

export function useViewMode(): ViewMode {
  const chosen = useSettingsStore((s) => s.viewMode)
  const reducedMotion = useReducedMotion()
  if (chosen) return chosen
  return reducedMotion || !hasWebGL() ? 'traditional' : 'immersive'
}
