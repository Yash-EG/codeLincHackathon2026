// Camera stops per room. Each key is the id of a [data-camera] section on that
// room's page: the camera sits at that stop when the section reaches the middle
// of the screen and glides between stops while you scroll.
//
// Units are meters. Every room is 5.5 m square with its walls at -x and -z, so
// the camera always looks in from the open front-right corner, like the
// reference renders. "missing" is the stop shown when a room has nothing to
// display yet.

import type { RoomId } from '../../rooms'

export type Vec3 = [number, number, number]

export interface CameraKeyframe {
  position: Vec3
  target: Vec3
}

const k = (position: Vec3, target: Vec3): CameraKeyframe => ({ position, target })

/** The whole room, three-quarter view from the open corner. */
const WIDE = k([8.6, 7.0, 8.6], [0, 0.9, -0.4])

const ROOM_KEYFRAMES: Record<RoomId, Record<string, CameraKeyframe>> = {
  entrance: {
    hero: k([7.8, 5.4, 9.0], [0, 1.4, -1.6]),
    what: k([2.4, 1.8, 3.6], [0, 1.5, -2.2]),
  },
  reception: {
    welcome: WIDE,
    'how-it-works': k([4.6, 3.0, 4.6], [1.2, 0.7, -2.0]), // across to the waiting sofa
    'check-in': k([2.4, 2.1, 3.0], [-1.05, 0.85, -0.3]), // in on the desk
    privacy: k([1.5, 1.9, 2.2], [-1.2, 1.0, -0.5]),
    doors: k([1.8, 1.9, 2.8], [-0.85, 1.2, -2.7]), // toward the hallway door
  },
  hallway: {
    intro: WIDE,
    directory: k([2.2, 1.9, 2.6], [-1.2, 1.3, -1.8]), // the numbered doors and directory board
  },
  operatory: {
    intro: WIDE,
    describe: k([2.9, 2.2, 3.0], [0.1, 0.8, 0.35]), // the dental chair
    'tooth-map': k([1.3, 1.75, 1.0], [-2.7, 1.7, -0.8]), // the wall screen
    planned: k([2.2, 1.9, 1.0], [0.8, 1.0, -2.3]), // cabinets and tray
    missing: k([2.9, 2.2, 3.0], [0.1, 0.8, 0.35]),
  },
  imaging: {
    intro: WIDE,
    coverage: k([2.4, 2.0, 1.8], [0.2, 1.3, -2.0]), // the X-ray unit
    limits: k([1.1, 1.7, 0.9], [-2.7, 1.65, -0.9]), // the light box
    'fine-print': k([1.2, 1.7, 2.4], [-2.7, 1.4, 0.9]), // the apron rack
    missing: k([2.4, 2.0, 1.8], [0.2, 1.3, -2.0]),
  },
  consult: {
    intro: WIDE,
    'this-year': k([1.4, 1.8, 1.3], [-2.7, 1.7, -1.25]), // cork board with the December calendar
    'next-year': k([2.6, 2.0, 2.0], [0.45, 0.8, -0.85]), // the desk
    savings: k([0.9, 1.7, 1.1], [2.2, 1.2, -2.5]), // the bookcase
    missing: k([1.4, 1.8, 1.3], [-2.7, 1.7, -1.25]),
  },
  billing: {
    intro: WIDE,
    'you-pay': k([2.2, 1.9, 1.8], [0.1, 1.0, -1.0]), // the checkout counter
    'line-items': k([1.2, 1.5, 0.3], [0.5, 1.05, -0.85]), // terminal and printer
    network: k([0.4, 1.8, 2.4], [0.0, 1.6, -2.7]), // the two network doors
    missing: k([2.2, 1.9, 1.8], [0.1, 1.0, -1.0]),
  },
  records: {
    intro: WIDE,
    'annual-max': k([2.1, 1.4, 0.2], [1.41, 0.88, -0.97]), // the coin jar
    history: k([1.4, 1.8, 1.2], [-1.65, 0.75, -2.4]), // filing cabinets
    reminders: k([1.6, 1.7, 0.6], [0.75, 1.75, -2.7]), // cork board
    missing: WIDE,
  },
}

/** Gentle orbit for any section without a tuned stop. */
const FALLBACK: CameraKeyframe[] = [
  WIDE,
  k([5.5, 3.6, 6.5], [-0.5, 0.9, -0.8]),
  k([6.5, 3.4, 4.0], [0.3, 0.9, -1.2]),
  k([4.0, 2.8, 5.0], [-1.0, 1.0, -1.4]),
]

export function keyframesFor(room: RoomId, sectionIds: string[]): CameraKeyframe[] {
  const tuned = ROOM_KEYFRAMES[room]
  return sectionIds.map((id, i) => tuned[id] ?? FALLBACK[i % FALLBACK.length])
}
