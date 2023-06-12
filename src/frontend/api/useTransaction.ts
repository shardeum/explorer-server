import useSWR from 'swr'
import { TransactionQuery } from '../types'
import { Transaction } from '../../types'
import { fetcher } from './fetcher'

import { PATHS } from './paths'
import { PagedTransaction } from '../types/transaction'

type TransactionResult = {
  transactions: Transaction[]
  totalPages: number
  totalTransactions: number
  totalRewardTxs: number
  totalStakeTxs: number
  totalUnstakeTxs: number
  loading: boolean
}

export const useTransaction = (query: TransactionQuery): TransactionResult => {
  const { page, count, txType, totalStakeData = false } = query

  const createUrl = (): string => {
    let url = `${PATHS.TRANSACTION}?page=${page}`

    if (count) url = `${PATHS.TRANSACTION}?count=${count}`
    if (txType) {
      url += `&txType=${txType}`
    }
    return url
  }

  const { data } = useSWR<PagedTransaction>(createUrl(), fetcher)

  const transactions: Transaction[] = data?.transactions || []

  const response = useSWR<PagedTransaction>(totalStakeData ? `${PATHS.TRANSACTION}?totalData=true` : null, fetcher)
  // let response
  // if (totalStakeData === true) {
  //   response = useSWR(`${PATHS.TRANSACTION}?totalData=true`)
  // }

  return {
    transactions,
    totalPages: data?.totalPages || 0,
    totalTransactions: data?.totalTransactions || 0,
    totalRewardTxs: response?.data?.totalRewardTxs || 0,
    totalStakeTxs: response?.data?.totalStakeTxs || 0,
    totalUnstakeTxs: response?.data?.totalUnstakeTxs || 0,
    loading: !data,
  }
}
