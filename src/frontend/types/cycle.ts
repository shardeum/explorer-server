export interface CycleQuery {
  count?: number;
}

export interface Cycle {
  counter: number;
  cycleMarker: string;
  cycleRecord: CycleRecord;
}

export interface CycleRecord {
  activated: any;
  activatedPublicKeys: any;
  active: number;
  apoptosized: any;
  counter: number;
  desired: number;
  duration: number;
  expired: number;
  joined: any;
  joinedArchivers: any;
  joinedConsensors: any;
  leavingArchivers: any;
  lost: any;
  lostSyncing: any;
  marker: string;
  maxSyncTime: number;
  networkConfigHash: string;
  networkDataHash: any;
  networkId: string;
  networkReceiptHash: any;
  networkStateHash: string;
  networkSummaryHash: any;
  previous: string;
  refreshedArchivers: any;
  refreshedConsensors: any;
  refuted: any;
  removed: any;
  returned: any;
  safetyMode: boolean;
  safetyNum: number;
  start: number;
  syncing: number;
}
