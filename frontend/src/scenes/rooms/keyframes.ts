// Camera stops per room. Each key is the id of a [data-camera] section in that
// room's page; the camera sits at that stop when the section reaches the
// middle of the screen and glides between stops while scrolling.
// Units: meters in the placeholder diorama (floor 8 x 8, centered on the origin).

import type { RoomId } from '../../rooms'

export type Vec3 = [number, number, number]

export interface CameraKeyframe {
  position: Vec3
  target: Vec3
}

const ROOM_KEYFRAMES: Partial<Record<RoomId, Record<string, CameraKeyframe>>> = {
  reception: {
    welcome: { position: [10, 7, 10], target: [0, 1, 0] }, // wide view from the front door
    'how-it-works': { position: [7.5, 4.5, 6.5], target: [-2, 0.8, 1] }, // pans across the waiting area
    'check-in': { position: [3.6, 2.8, 2.6], target: [1, 1.1, -1.6] }, // pushes in on the desk
    privacy: { position: [2.8, 2.3, 1.8], target: [1, 1.1, -1.6] }, // rests on the desk
    doors: { position: [1.8, 2.4, 4], target: [-1.5, 1.4, -4] }, // turns toward the hallway door
  },
}

/** Gentle orbit used by rooms that don't have tuned keyframes yet. */
const DEFAULT_PATH: CameraKeyframe[] = [
  { position: [10, 7, 10], target: [0, 1, 0] },
  { position: [6, 4.5, 8.5], target: [-1, 1, 0] },
  { position: [8.5, 4, 4], target: [0.5, 1, -1.5] },
  { position: [5, 3.2, 6], target: [-1.5, 1.2, -2] },
  { position: [9, 5.5, 7], target: [0, 1, -0.5] },
]

export function keyframesFor(room: RoomId, sectionIds: string[]): CameraKeyframe[] {
  const tuned = ROOM_KEYFRAMES[room]
  return sectionIds.map((id, i) => tuned?.[id] ?? DEFAULT_PATH[i % DEFAULT_PATH.length])
}
