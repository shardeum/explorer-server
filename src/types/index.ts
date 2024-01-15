export interface NetworkParameters {
  title: string
  description: string
  nodeRewardInterval: number
  nodeRewardAmount: number
  nodePenalty: number
  stakeRequired: number
  maintenanceInterval: number
  maintenanceFee: number
}

export * from './account'
export * from './cycle'
export * from './originalTxData'
export * from './receipt'
export * from './serverResponseTypes'
export * from './transaction'
export * from './websocket'
