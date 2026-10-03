// The building directory: one entry per route. Navigation, door cards, page
// titles and screen-reader arrival announcements all read from this list.

export type RoomId = 'entrance' | 'reception' | 'hallway' | 'operatory' | 'imaging' | 'consult' | 'billing' | 'records'

/** What a room needs before it has anything to show. Doors still work; they say what's missing. */
export type Prerequisite = 'plan' | 'procedure'

export interface Room {
  id: RoomId
  path: string
  /** Short name: directory, door plaques, document title. */
  name: string
  /** One line: what the user does there. Also read out on arrival. */
  purpose: string
  /** 1-2 sentence text description of the room (the canvas itself is aria-hidden). */
  description: string
  /** Challenge item this room answers. */
  requirement?: string
  prerequisite?: Prerequisite
}

export const ROOMS: Room[] = [
  {
    id: 'entrance',
    path: '/',
    name: 'Entrance',
    purpose: 'Start here.',
    description: 'Molarity reads your dental plan, prices the care your dentist recommended and tells you when to schedule it.',
  },
  {
    id: 'reception',
    path: '/reception',
    name: 'Reception',
    purpose: 'Check in your dental plan.',
    description:
      'A bright waiting room with a curved front desk. Check in your plan here: use the sample plan or type in the numbers from your benefits summary.',
    requirement: 'Plan details',
  },
  {
    id: 'hallway',
    path: '/hallway',
    name: 'Hallway',
    purpose: 'Choose a room.',
    description: 'A hallway of doors with a directory sign. Every room in the office is listed here.',
  },
  {
    id: 'operatory',
    path: '/operatory',
    name: 'Operatory',
    purpose: 'Describe your care.',
    description:
      'The treatment room with the dental chair. Describe what your dentist recommended, or pick a tooth on the map.',
    requirement: 'Procedure',
    prerequisite: 'plan',
  },
  {
    id: 'imaging',
    path: '/imaging',
    name: 'Imaging',
    purpose: 'Read your coverage in plain English.',
    description:
      'The X-ray room, where the fine print gets a closer look: what each kind of care is covered at, waiting periods and frequency limits.',
    requirement: 'Coverage translation',
    prerequisite: 'plan',
  },
  {
    id: 'consult',
    path: '/consult',
    name: 'Consult office',
    purpose: 'Plan when to get your care.',
    description:
      'A quiet office with a wall calendar. See what to do before your benefits reset and what to move into the next plan year.',
    requirement: 'Sequencing',
    prerequisite: 'procedure',
  },
  {
    id: 'billing',
    path: '/billing',
    name: 'Billing',
    purpose: "See what you'll pay.",
    description:
      'The checkout counter. Every planned procedure, what insurance pays, what you pay, and how in-network and out-of-network compare.',
    requirement: 'Cost estimate',
    prerequisite: 'procedure',
  },
  {
    id: 'records',
    path: '/records',
    name: 'Records',
    purpose: 'Track your annual maximum and reminders.',
    description:
      'Filing cabinets and a cork board. Your annual maximum, this year’s claims, and reminders you can add to your calendar.',
    requirement: 'Annual max + reminders',
    prerequisite: 'plan',
  },
]

export const ROOMS_BY_ID = Object.fromEntries(ROOMS.map((room) => [room.id, room])) as Record<RoomId, Room>

export function roomForPath(pathname: string): Room | undefined {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return ROOMS.find((room) => room.path === path)
}

export const PREREQUISITE_MESSAGE: Record<Prerequisite, string> = {
  plan: 'Check in a plan at Reception first.',
  procedure: 'Add a procedure in the Operatory first.',
}
