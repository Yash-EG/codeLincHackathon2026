// Universal Numbering System (the US standard used on CDT claims).
// Numbering runs clockwise from the dentist's view:
//   1-8   upper right (third molar -> central incisor)
//   9-16  upper left  (central incisor -> third molar)
//   17-24 lower left  (third molar -> central incisor)
//   25-32 lower right (central incisor -> third molar)
// "Left"/"right" are the patient's sides.

export type ToothType = 'incisor' | 'canine' | 'premolar' | 'molar'
export type Arch = 'upper' | 'lower'
export type Side = 'left' | 'right'

export interface ToothInfo {
  number: number
  name: string
  type: ToothType
  arch: Arch
  side: Side
  /** 0 = central incisor ... 7 = third molar */
  indexFromMidline: number
}

const POSITION_NAMES = [
  'central incisor',
  'lateral incisor',
  'canine',
  'first premolar',
  'second premolar',
  'first molar',
  'second molar',
  'third molar',
] as const

const TYPE_BY_INDEX: ToothType[] = [
  'incisor',
  'incisor',
  'canine',
  'premolar',
  'premolar',
  'molar',
  'molar',
  'molar',
]

function describe(number: number): Pick<ToothInfo, 'arch' | 'side' | 'indexFromMidline'> {
  if (number <= 8) return { arch: 'upper', side: 'right', indexFromMidline: 8 - number }
  if (number <= 16) return { arch: 'upper', side: 'left', indexFromMidline: number - 9 }
  if (number <= 24) return { arch: 'lower', side: 'left', indexFromMidline: 24 - number }
  return { arch: 'lower', side: 'right', indexFromMidline: number - 25 }
}

export const TEETH: ToothInfo[] = Array.from({ length: 32 }, (_, i) => {
  const number = i + 1
  const { arch, side, indexFromMidline } = describe(number)
  const position = POSITION_NAMES[indexFromMidline]
  return {
    number,
    arch,
    side,
    indexFromMidline,
    type: TYPE_BY_INDEX[indexFromMidline],
    name: `${arch === 'upper' ? 'Upper' : 'Lower'} ${side} ${position}`,
  }
})

export function getTooth(number: number | null | undefined): ToothInfo | undefined {
  if (number == null || number < 1 || number > 32) return undefined
  return TEETH[number - 1]
}

export function findTooth(arch: Arch, side: Side, indexFromMidline: number): ToothInfo {
  const match = TEETH.find(
    (t) => t.arch === arch && t.side === side && t.indexFromMidline === indexFromMidline,
  )
  if (!match) throw new Error(`No tooth for ${arch} ${side} ${indexFromMidline}`)
  return match
}
