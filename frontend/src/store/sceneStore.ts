// Camera state shared between the DOM (scroll position) and the 3D canvas.
// The canvas reads it with getState() inside useFrame, so scrolling never
// re-renders React components.

import { create } from 'zustand'
import type { CameraKeyframe } from '../scenes/rooms/keyframes'

interface SceneState {
  /** One keyframe per [data-camera] section of the current room, in page order. */
  keyframes: CameraKeyframe[]
  /** 0 at the first section, 1 at the second, ... (fractional between them). */
  progress: number
  setPath: (keyframes: CameraKeyframe[], progress: number) => void
  setProgress: (progress: number) => void
}

export const useSceneStore = create<SceneState>()((set) => ({
  keyframes: [],
  progress: 0,
  setPath: (keyframes, progress) => set({ keyframes, progress }),
  setProgress: (progress) => set({ progress }),
}))
