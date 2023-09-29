import { TransactionType } from './transaction'

export interface OriginalTxData {
  txId: string
  timestamp: number
  cycle: number
  originalTxData: any
  sign: {
    owner: string
    sig: string
  }
}

export interface OriginalTxData2 {
  txId: string
  txHash: string
  timestamp: number
  cycle: number
  transactionType: TransactionType
}

// Combine the two interfaces above into one
export interface OriginalTxDataInterface {
  txId: string
  timestamp: number
  cycle: number
  originalTxData?: any
  sign?: {
    owner: string
    sig: string
  }
  txHash?: string
  transactionType?: TransactionType
}
