import useSWR from 'swr'
import { Transaction, TransactionQuery } from '../types'

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
  const { page, count, txType } = query

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

  const res = {
    transactions,
    totalPages: data?.totalPages || 0,
    totalTransactions: data?.totalTransactions || 0,
    totalRewardTxs: data?.totalRewardTxs || 0,
    totalStakeTxs: data?.totalStakeTxs || 0,
    totalUnstakeTxs: data?.totalUnstakeTxs || 0,
    loading: !data,
  }

  return res
}
