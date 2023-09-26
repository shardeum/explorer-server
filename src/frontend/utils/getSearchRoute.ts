import { api } from '../api/axios'
import { PATHS } from '../api/paths'
import { AccountType } from '../types'

export const isTransactionHash = async (searchText: string): Promise<boolean> => {
  const {
    data: { success, transactions },
  } = await api.get(`${PATHS.TRANSACTION}?txHash=${`0x${searchText}`}`)
  return success && transactions
}

export const isNodeAccount = async (searchText: string): Promise<boolean> => {
  const {
    data: { success, accounts },
  } = await api.get(`${PATHS.ACCOUNT}?address=${searchText}&accountType=${AccountType.NodeAccount2}`)
  return success && accounts[0].accountId === searchText
}
