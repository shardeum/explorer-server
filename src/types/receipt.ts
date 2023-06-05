export interface ReadableReceipt {
  status?: boolean | string | number
  transactionHash: string
  transactionIndex: string
  blockNumber: string
  nonce: string
  blockHash: string
  cumulativeGasUsed: string
  gasUsed: string
  logs: any[]
  logBloom: string
  contractAddress: string | null
  from: string
  to: string
  value: string
  data: string
  stakeInfo?: {
    nominee?: string
    stakeAmount?: string
    totalStakeAmount?: string
    totalUnstakeAmount?: string
    stake?: string
    reward?: string
    penalty?: string
  }
}
