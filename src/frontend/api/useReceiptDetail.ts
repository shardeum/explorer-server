import { PATHS } from './paths'

import useSWR from 'swr'

import { fetcher } from './fetcher'

export const useReceiptDetail = (id: string) => {
  const { data: transactionData } = useSWR(`${PATHS.TRANSACTION_DETAIL}?txHash=${id}&type=requery`, fetcher)
  const { data: receiptData } = useSWR(() => {
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
