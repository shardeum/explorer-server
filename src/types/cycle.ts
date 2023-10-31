import { P2P, StateManager } from '@shardus/types'

export interface Cycle {
  cycleMarker: StateManager.StateMetaDataTypes.CycleMarker
  counter: number
  cycleRecord: P2P.CycleCreatorTypes.CycleData
}
