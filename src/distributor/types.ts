import { WrappedEVMAccount } from '../types'

// Data types for data from collector

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ArchivedCycles {
  archivedCycles: any[]
  sign: {
    owner: string
    sig: string
  }
}

export interface ArchivedReceipts {
  receipts: any[]
  cycles: any[]
  sign: {
    owner: string
    sig: string
  }
}

export interface ReadableReceipt {
  data: WrappedEVMAccount
  timestamp: number
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// Ethereum log data types

export interface Log {
  address: string
  blockHash: string
  blockNumber: string
  data: string
  logIndex: string
  topics: string[]
  transactionHash: string
  transactionIndex: string
}
