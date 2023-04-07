import { ContractType } from './contract'

export interface AccountQuery {
  page?: number
  count?: number
  type?: number
}

export interface Account {
  accountId: string
  accountType: number
  contractInfo: any
  contractType: any
  cycle: number
  ethAddress: string
  hash: string
  timestamp: number
  account: AccountDetail
}

export interface AccountDetail {
  balance: string
  codeHash: {
    data: number[]
    type: string
  }
  nonce: string
  stateRoot: {
    data: number[]
    type: string
  }
  rewardStartTime: number
  rewardEndTime: number
  nominator: string
  stakeLock: number
  reward: number
}

export enum AccountSearchType {
  All, // All Accounts Type
  EOA,
  CA,
  GENERIC, // Generic Contract Type
  ERC_20,
  ERC_721,
  ERC_1155,
  Receipt,
  StakeReceipt,
  UnstakeReceipt,
  NetworkAccount,
  NodeAccount,
  NodeRewardReceipt,
  NodeAccount2,
  ContractStorage,
  ContractCode,
}
export enum AccountType {
  Account, //  EOA or CA
  ContractStorage, // Contract storage key value pair
  ContractCode, // Contract code bytes
  Receipt, //This holds logs for a TX
  Debug,
  NetworkAccount,
  NodeAccount,
  NodeRewardReceipt,
  DevAccount,
  NodeAccount2,
  StakeReceipt,
  UnstakeReceipt,
}

export interface Token {
  contractAddress: string
  contractInfo: any
  contractType: ContractType
  balance: string
}
