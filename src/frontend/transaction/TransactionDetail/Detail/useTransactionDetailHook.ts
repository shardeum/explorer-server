import { useCallback, useEffect, useState } from 'react'
import { api, PATHS } from '../../../api'
import { Transaction } from '../../../../types'

interface TransactionDetailHookResult<D extends object> {
  transactionData: Transaction
  receiptData: D
  showReceipt: boolean
  setShowReceipt: (show: boolean) => void
}

export const useTransactionDetailHook = <D extends object>(
  txHash: string,
  txId: string | undefined = undefined
): TransactionDetailHookResult<D> => {
  const [transactionData, setTransactionData] = useState<Transaction>({} as Transaction)
  const [receiptData, setReceiptData] = useState({} as D)
  const [showReceipt, setShowReceipt] = useState(false)

  const getTransaction = useCallback(async () => {
    const data = await api.get(`${PATHS.TRANSACTION_DETAIL}?txHash=${txHash}&type=requery`)
    let transaction = {} as Transaction
    if (txId) transaction = data?.data?.transactions?.filter((tx: Transaction) => tx.txId === txId)?.[0]
    else transaction = data?.data?.transactions?.[0]
    return transaction
  }, [txHash, txId])

  const getReceipt = useCallback(async () => {
    let data = await api.get(`${PATHS.TRANSACTION_DETAIL}?txHash=${txHash}&type=requery`)
    if (data?.data?.transactions?.length > 0) {
      let transaction = {} as Transaction
      if (txId) transaction = data?.data?.transactions?.filter((tx: Transaction) => tx.txId === txId)?.[0]
      else transaction = data?.data?.transactions?.[0]
      const transactionId = transaction.txId
      data = await api.get(`${PATHS.RECEIPT_DETAIL}?txId=${transactionId}`)
      if (data?.data?.receipts) {
        return {
          transactionData: transaction,
          receiptData: data?.data?.receipts,
        }
      }
    }
    return {
      transactionData: {} as Transaction,
      receiptData: {},
    }
  }, [txHash, txId])

  useEffect(() => {
    if (!txHash) return
    async function fetchData(): Promise<void> {
      if (showReceipt) {
        const data = await getReceipt()
        setReceiptData(data?.receiptData)
        setTransactionData(data?.transactionData)
      } else {
        const transaction = await getTransaction()
        setTransactionData(transaction)
      }
    }

    fetchData()
  }, [txHash, showReceipt, getReceipt, getTransaction])

  return {
    transactionData,
    receiptData,
    showReceipt,
    setShowReceipt,
  }
}
