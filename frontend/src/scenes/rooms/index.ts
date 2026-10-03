import type { ComponentType } from 'react'
import type { RoomId } from '../../rooms'
import BillingScene from './BillingScene'
import ConsultScene from './ConsultScene'
import EntranceScene from './EntranceScene'
import HallwayScene from './HallwayScene'
import ImagingScene from './ImagingScene'
import OperatoryScene from './OperatoryScene'
import ReceptionScene from './ReceptionScene'
import RecordsScene from './RecordsScene'

/** The 3D scene behind each route. */
export const ROOM_SCENES: Record<RoomId, ComponentType> = {
  entrance: EntranceScene,
  reception: ReceptionScene,
  hallway: HallwayScene,
  operatory: OperatoryScene,
  imaging: ImagingScene,
  consult: ConsultScene,
  billing: BillingScene,
  records: RecordsScene,
}
