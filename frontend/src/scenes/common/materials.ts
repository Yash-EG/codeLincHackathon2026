// Shared clay materials: one instance each, reused by every mesh that needs it.
// Matte (high roughness, no metalness) so the soft lighting reads as clay.

import { MeshStandardMaterial } from 'three'

const clay = (color: string, roughness = 0.9) => new MeshStandardMaterial({ color, roughness, metalness: 0 })

export const MATERIALS = {
  floor: clay('#d8b78e', 0.8), // light oak
  rug: clay('#b9dccb'),
  wainscot: clay('#b9d3e6'), // light-blue lower wall band
  cream: clay('#f3ead8'),
  wood: clay('#c89f74', 0.75),
  sage: clay('#a9bea0'),
  leaf: clay('#6fa58a'),
  pot: clay('#e7d9c4'),
  door: clay('#1f4e79', 0.7),
  window: new MeshStandardMaterial({ color: '#fdf9ee', emissive: '#fdf6e3', emissiveIntensity: 0.6, roughness: 1 }),
}
