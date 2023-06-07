import { P2P, StateManager } from '@shardus/types'

export interface Cycle {
  cycleMarker: StateManager.StateMetaDataTypes.CycleMarker
  counter: number
  cycleRecord: P2P.CycleCreatorTypes.CycleData
}

// export interface CycleRecord {
//   activated: { id: string }[]
//   activatedPublicKeys: unknown
//   active: number
//   apoptosized: unknown
//   counter: number
//   desired: number
//   duration: number
//   expired: number
//   joined: unknown
//   joinedArchivers: unknown
//   joinedConsensors: { id: string }[]
//   leavingArchivers: unknown
//   lost: string[]
//   lostSyncing: unknown
//   marker: string
//   maxSyncTime: number
//   networkConfigHash: string
//   networkDataHash: unknown
//   networkId: string
//   networkReceiptHash: unknown
//   networkStateHash: string
//   networkSummaryHash: unknown
//   previous: string
//   refreshedArchivers: { publicKey: string }[]
//   refreshedConsensors: { id: string }[]
//   refuted: string[]
//   removed: string[]
//   returned: unknown
//   safetyMode: boolean
//   safetyNum: number
//   start: number
//   syncing: number
// }
