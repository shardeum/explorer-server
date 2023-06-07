import useSWR from 'swr'
import { Transaction } from '../../types'

import { fetcher } from './fetcher'

import { PATHS } from './paths'

export type TransactionDetailResult = {
  data: Transaction | undefined
}

export const useTransactionDetail = (id: string): TransactionDetailResult => {
  const { data } = useSWR<{ transactions: Transaction[] }>(
    `${PATHS.TRANSACTION_DETAIL}?txHash=${id}&type=requery`,
    fetcher
  )

  return {
    data: data?.transactions?.[0],
  }
}
