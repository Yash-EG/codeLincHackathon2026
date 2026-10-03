// Pure geometry for placing 16 teeth per arch along a parabolic dental arch.
// Scene units: x = patient's left (+) / right (-) as seen from the front,
// y = up, z = toward the viewer. The occlusal plane is y = 0.

import type { ToothInfo } from '../../data/teeth'

/** Mesiodistal crown width by index from midline (central incisor ... third molar). */
export const TOOTH_WIDTHS = [0.44, 0.36, 0.4, 0.37, 0.37, 0.52, 0.48, 0.44] as const

/** Half the vertical opening between the arches. */
export const OCCLUSAL_GAP = 0.32
/** Each arch hinges open by this much (radians) so the lower teeth stay visible. */
export const ARCH_TILT = 0.1

const GAP = 0.035 // space between neighboring teeth
const CURVATURE = 0.7 // arch follows z = Z_FRONT - CURVATURE * x^2
const Z_FRONT = 1.3

/** x at which the arc length along the arch (from the midline) reaches `s`. */
function xAtArcLength(s: number): number {
  const dx = 0.002
  let x = 0
  let length = 0
  while (length < s) {
    const slope = 2 * CURVATURE * (x + dx / 2)
    length += Math.sqrt(1 + slope * slope) * dx
    x += dx
  }
  return x
}

// Arc-length position of each tooth center, measured from the midline.
const ARC_CENTERS: number[] = []
let arcCursor = GAP / 2
for (const width of TOOTH_WIDTHS) {
  ARC_CENTERS.push(arcCursor + width / 2)
  arcCursor += width + GAP
}
const ARC_END_X = xAtArcLength(arcCursor)

export interface ToothPlacement {
  tooth: ToothInfo
  position: [number, number, number]
  /** Turns the tooth so its cheek-facing side points out of the arch. */
  rotationY: number
}

export function placeTooth(tooth: ToothInfo): ToothPlacement {
  // Patient's right shows on the viewer's left (we look at the patient's face).
  const sign = tooth.side === 'right' ? -1 : 1
  const x = sign * xAtArcLength(ARC_CENTERS[tooth.indexFromMidline])
  return {
    tooth,
    position: [x, tooth.arch === 'upper' ? OCCLUSAL_GAP : -OCCLUSAL_GAP, Z_FRONT - CURVATURE * x * x],
    rotationY: Math.atan2(2 * CURVATURE * x, 1),
  }
}

/** Points along the full arch (molar to molar) at height `y`, for the gum ribbon. */
export function archCurvePoints(y: number, segments = 64): Array<[number, number, number]> {
  return Array.from({ length: segments + 1 }, (_, i) => {
    const x = -ARC_END_X + (2 * ARC_END_X * i) / segments
    return [x, y, Z_FRONT - CURVATURE * x * x]
  })
}
