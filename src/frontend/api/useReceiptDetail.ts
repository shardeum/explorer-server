import { PATHS } from './paths'

import useSWR from 'swr'

import { fetcher } from './fetcher'
import { Transaction, Receipt } from '../../types'

type ReceiptDetailResult = {
  data: {
    receiptData: Receipt
    transactionData: Transaction
  }
}

export const useReceiptDetail = (txHash: string): ReceiptDetailResult | null => {
  const { data: transactionData } = useSWR<{ transactions: Transaction[] }>(
    `${PATHS.TRANSACTION_DETAIL}?txHash=${txHash}&type=requery`,
    fetcher
  )

  let transaction: Transaction | null = null
  const { data: receiptData } = useSWR<{ receipts: Receipt }>(() => {
    if (transactionData && (transaction = transactionData?.transactions?.[0])) {
      return `${PATHS.RECEIPT_DETAIL}?txId=${transaction.txId}`
    }
    return null
  }, fetcher)

  if (transaction && receiptData) {
    return {
      data: {
        receiptData: receiptData?.receipts,
        transactionData: transaction,
      },
    }
  } else return null
}
