// Scene colors, taken from the reference renders: cream and sage walls, a
// maroon + orange rail, white trim, light oak, and mint for Reception.

export const C = {
  white: '#f4f1ec', // trim, doors, cut wall edges
  shell: '#f1eee8', // base slab and wall cores
  cream: '#ece5d8', // upholstery
  upperWall: '#efe9df',
  sage: '#9ec3ac', // lower wall
  mintBack: '#b0d5c4', // Reception walls
  mintSide: '#9fc5b0',
  maroon: '#8a1538',
  orange: '#f26b21',
  red: '#c4362f',
  oak: '#c9a073',
  walnut: '#9b6b47',
  chrome: '#d9dde0',
  charcoal: '#2b3640',
  primary: '#1f4e79',
  teal: '#0e8a6c',
  leaf: '#4f7f57',
  leafLight: '#79a873',
  background: '#dcd8d1', // warm gray behind the diorama
}

/** Interior size of every room: 5.5 m square, 2.9 m walls. Origin at the floor center; walls at -x and -z. */
export const ROOM = { half: 2.75, height: 2.9, wall: 0.16 }

/** Distance from the room center to the painted wall face: mount wall items at -FACE. */
export const FACE = ROOM.half - 0.012

/** rotY for things mounted on the left wall (turns +z to face +x). */
export const ON_LEFT = Math.PI / 2
