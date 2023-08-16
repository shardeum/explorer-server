import useSWR from 'swr'
import { TransactionQuery } from '../types'
import { OriginalTxData, Transaction, TransactionSearchType } from '../../types'
import { fetcher } from './fetcher'

import { PATHS } from './paths'
import { PagedTransaction } from '../types/transaction'

export const useTransaction = (query: TransactionQuery): PagedTransaction => {
  const { page, count, txType, totalStakeData = false } = query

  const createUrl = (): string => {
    let url = `${PATHS.TRANSACTION}?page=${page}`

    if (count) url = `${PATHS.TRANSACTION}?count=${count}`
    if (txType) {
      url += `&txType=${txType}`
      if (txType === TransactionSearchType.Pending)
        url = `${PATHS.ORIGINAL_TX}?pending=true&decode=true?page=${page}`
    }
    return url
  }

  const { data } = useSWR<PagedTransaction>(createUrl(), fetcher)

  const transactions: Transaction[] = data?.transactions || []
  const originalTxs: OriginalTxData[] = data?.originalTxs || []

  const response = useSWR<PagedTransaction>(
    totalStakeData ? `${PATHS.TRANSACTION}?totalStakeData=true` : null,
    fetcher
  )

  return {
    transactions,
    originalTxs,
    totalPages: data?.totalPages || 0,
    totalTransactions: data?.totalTransactions || 0,
    totalOriginalTxs: data?.totalOriginalTxs || 0,
    totalRewardTxs: response?.data?.totalRewardTxs || 0,
    totalStakeTxs: response?.data?.totalStakeTxs || 0,
    totalUnstakeTxs: response?.data?.totalUnstakeTxs || 0,
    loading: !data,
  }
}
