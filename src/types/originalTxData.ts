import { TransactionType } from './transaction'

export interface OriginalTxData {
  txId: string
  timestamp: number
  cycle: number
  originalTxData: {
    tx: {
      raw: string
      timestamp: number
      isInternalTx?: boolean
      internalTXType?: number
    }
    timestampReceipt?: {
      cycleCounter: number
      cycleMarker: string
      sign: {
        owner: string
        sig: string
      }
      timestamp: number
      txId: string
    }
  }
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
  internalTXType?: number
}

// Combine the two interfaces above into one
export interface OriginalTxDataInterface {
  txId: string
  timestamp: number
  cycle: number
  originalTxData?: {
    tx: {
      raw: string
      timestamp: number
    }
    timestampReceipt?: {
      cycleCounter: number
      cycleMarker: string
      sign: {
        owner: string
        sig: string
      }
      timestamp: number
      txId: string
    }
    readableReceipt?: {
      from: string
      to: string
      nonce: string
      value: string
      data: string
      internalTxData?: unknown
    }
  }
  sign?: {
    owner: string
    sig: string
  }
  txHash?: string
  transactionType?: TransactionType
}
