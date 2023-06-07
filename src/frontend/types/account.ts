import { Account } from '../../types'

export interface AccountQuery {
  page?: number
  count?: number
  type?: number
}

// export interface AccountDetail {
//   balance: string
//   codeHash: {
//     data: number[]
//     type: string
//   }
//   nonce: string
//   stateRoot: {
//     data: number[]
//     type: string
//   }
//   rewardStartTime: number
//   rewardEndTime: number
//   nominator: string
//   stakeLock: string
//   reward: string
// }

export type PagedAccountData = {
  accounts: Account[]
  totalPages: number
  totalAccounts: number
  totalContracts: number
}
