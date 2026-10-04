// Scroll state shared between the DOM (page sections) and the 3D canvas.
// The canvas reads `progress` with getState() inside useFrame, so scrolling
// never re-renders React components; only a change of section does.

import { create } from 'zustand'

export interface DoorTransitionState {
  doorId: string | null
  time: number
  active: boolean
}

interface SceneState {
  /** Ids of the current page's [data-camera] sections, in page order. */
  sectionIds: string[]
  /** 0 at the first section, 1 at the second, ... (fractional between them). */
  progress: number
  /** Frame-synced door swing and plaque lighting transition state */
  doorTransition: DoorTransitionState
  setSections: (sectionIds: string[], progress: number) => void
  setProgress: (progress: number) => void
  setDoorTransition: (doorTransition: DoorTransitionState) => void
}

export const useSceneStore = create<SceneState>()((set) => ({
  sectionIds: [],
  progress: 0,
  doorTransition: { doorId: null, time: 0, active: false },
  setSections: (sectionIds, progress) => set({ sectionIds, progress }),
  setProgress: (progress) => set({ progress }),
  setDoorTransition: (doorTransition) => set({ doorTransition }),
}))

/** Index of the section in view: the one whose station the camera is holding on. */
export function useActiveSection(): number {
  return useSceneStore((s) => Math.max(0, Math.min(Math.round(s.progress), s.sectionIds.length - 1)))
}
