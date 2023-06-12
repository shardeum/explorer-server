import { TransactionSearchType, Transaction } from '../../types'

export interface ReadableReceipt {
  blockHash: string
  blockNumber: string
  contractAddress: string
  cumulativeGasUsed: string
  data: string
  from: string
  gasUsed: string
  logs: Log[]
  nonce: string
  status: number
  to: string
  transactionHash: string
  transactionIndex: string
  value: string
  stakeInfo: StakeInfo
}

export interface WrappedEVMAccount {
  accountType: number
  ethAddress: string
  hash: string
  readableReceipt: ReadableReceipt
  timestamp: number
  txFrom: string
  txId: string
  amountSpent?: string
}

export interface TransactionQuery {
  page?: number
  count?: number
  txType?: TransactionSearchType
  totalStakeData?: boolean
}

export const TransactionSearchList: {
  key: TransactionSearchType
  value: string
}[] = [
    { key: TransactionSearchType.AllExceptInternalTx, value: 'All Transactions' },
    { key: TransactionSearchType.StakeReceipt, value: 'Stake Transactions' },
    { key: TransactionSearchType.UnstakeReceipt, value: 'Unstake Transactions' },
    { key: TransactionSearchType.EVM_Internal, value: 'Internal Transactions' },
    { key: TransactionSearchType.ERC_20, value: 'ERC 20 Token Transactions' },
    { key: TransactionSearchType.ERC_721, value: 'ERC 721 Token Transactions' },
    {
      key: TransactionSearchType.ERC_1155,
      value: 'ERC 1155 Token Transactions',
    },
  ]

export interface StakeInfo {
  nominee: string
  stake?: string,
  totalStakeAmount?: string,
  penalty?: string,
  reward?: string,
  totalUnstakeAmount?: string
}

export interface Log {
  logIndex: number
  address: number
  topics: string[]
  data: string
}

export type PagedTransaction = {
  transactions: Transaction[]
  totalPages: number
  totalTransactions: number
  totalRewardTxs: number
  totalStakeTxs: number
  totalUnstakeTxs: number
}
