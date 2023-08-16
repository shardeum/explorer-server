import { TransactionType } from './transaction'

export interface OriginalTxData {
  txId: string
  txHash: string
  timestamp: number
  cycle: number
  originalTxData: any
  transactionType: TransactionType
  sign: {
    owner: string
    sig: string
  }
}
