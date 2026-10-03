import { ExtrudeGeometry, Shape } from 'three'

/**
 * A curved slab: an annulus sector extruded by `height`. Rotate the mesh -90°
 * about X to stand it up; the arc then bulges toward +z (angles 180°..360°).
 * UVs come out in meters, so tiling textures keep their real-world scale.
 */
export function arcSlab(rIn: number, rOut: number, fromDeg: number, toDeg: number, height: number) {
  const a0 = (fromDeg * Math.PI) / 180
  const a1 = (toDeg * Math.PI) / 180
  const shape = new Shape()
  shape.moveTo(Math.cos(a0) * rOut, Math.sin(a0) * rOut)
  shape.absarc(0, 0, rOut, a0, a1, false)
  shape.lineTo(Math.cos(a1) * rIn, Math.sin(a1) * rIn)
  shape.absarc(0, 0, rIn, a1, a0, true)
  shape.closePath()
  return new ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 2,
    curveSegments: 48,
  })
}
