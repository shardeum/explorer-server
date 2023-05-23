import { api } from '../api/axios'
import { PATHS } from '../api/paths'

export const isTransactionHash = async (searchText: string): Promise<boolean> => {
  const {
    data: { success, transactions },
  } = await api.get(`${PATHS.TRANSACTION}?txHash=${`0x${searchText}`}`)
  return success && transactions
}

export const isNodeAccount = async (searchText: string): Promise<boolean> => {
  const {
    data: { success, accounts },
  } = await api.get(`${PATHS.ADDRESS}?address=${searchText}&accountType=9`)
  return success && accounts[0].accountId === searchText
}
