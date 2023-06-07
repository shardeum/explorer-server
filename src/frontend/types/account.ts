import { Account, ContractType, ContractInfo } from '../../types'

export interface AccountQuery {
  page?: number
  count?: number
  type?: number
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
  stakeLock: string
  reward: string
}

export interface Token {
  contractAddress: string
  contractInfo: ContractInfo
  contractType: ContractType
  balance: string
}

export type PagedAccountData = {
  accounts: Account[]
  totalPages: number
  totalAccounts: number
  totalContracts: number
}
