import { OriginalTxDataInterface } from './originalTxData'

export type ErrorResponse = {
  success: boolean
  error: string
}

export type CoinResponse = {
  success: boolean
  lastUpdatedCycle: number
  totalSupply: number
  totalStaked: number
}

export type LogResponse = {
  success: boolean
  logs: unknown
  totalPages?: number
  transactions?: unknown
  totalLogs?: number
}

export type ReceiptResponse = {
  success: boolean
  receipts?: unknown
  totalPages?: number
  totalReceipts?: number
}

export type OriginalTxResponse = {
  success: boolean
  originalTxs?: OriginalTxDataInterface[] | number
  totalPages?: number
  totalOriginalTxs?: number
}

export type TransactionResponse = {
  success: boolean
  transactions?: Array<unknown>
  totalPages?: number
  totalStakeTxs?: number
  totalRewardTxs?: number
  totalUnstakeTxs?: number
  totalTransactions?: number
  filterAddressTokenBalance?: number
}

export type TokenResponse = {
  success: boolean
  tokens?: unknown
  totalTokenHolders?: number
  totalPages?: number
}

export type AddressResponse = {
  success: boolean
  accounts?: unknown
}

export type AccountResponse = {
  success: boolean
  accounts?: unknown
  totalPages?: number
  totalAccounts?: number
  totalContracts?: number
}
