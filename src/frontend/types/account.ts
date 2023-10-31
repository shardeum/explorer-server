import { Account } from '../../types'

export interface AccountQuery {
  page?: number
  count?: number
  type?: number
}

export type PagedAccountData = {
  accounts: Account[]
  totalPages: number
  totalAccounts: number
  totalContracts: number
}
