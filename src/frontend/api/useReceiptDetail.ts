import { PATHS } from './paths'

import useSWR from 'swr'

import { fetcher } from './fetcher'
import { Transaction } from '../types'
import { Receipt } from '../../storage/receipt'

type ReceiptDetailResult = {
  data: {
    receiptData: Receipt
    transactionData: Transaction
  }
}

export const useReceiptDetail = (txHash: string): ReceiptDetailResult => {
  const { data: transactionData } = useSWR<{ transactions: Transaction }>(
    `${PATHS.TRANSACTION_DETAIL}?txHash=${txHash}&type=requery`,
    fetcher
  )
  const { data: receiptData } = useSWR<{ receipts: Receipt }>(() => {
    if (transactionData?.transactions?.[0]) {
      return `${PATHS.RECEIPT_DETAIL}?txId=${transactionData?.transactions?.[0].txId}`
    }
    return null
  }, fetcher)
  if (receiptData?.receipts) {
    return {
      data: {
        receiptData: receiptData?.receipts,
        transactionData: transactionData?.transactions?.[0],
      },
    }
  }
  return {
    data: null,
  }
}
