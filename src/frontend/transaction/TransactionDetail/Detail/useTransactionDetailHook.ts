import { ChangeEvent, ChangeEventHandler, useCallback, useEffect, useState } from 'react'
import { api, PATHS } from '../../../api'
import { Transaction } from '../../../types'
// import { Account, AccountSearchType, Token, Transaction, TransactionSearchType } from '../types'

interface detailProps {
  id: string
  receiptParam?: boolean
}

export const useTransactionDetailHook = (id: string) => {
  const [transactionData, setTransactionData] = useState<Transaction>({} as Transaction)
  const [receiptData, setReceiptData] = useState({})
  const [showReceipt, setShowReceipt] = useState(false)

  const getTransaction = useCallback(async () => {
    const data = await api.get(`${PATHS.TRANSACTION_DETAIL}?txHash=${id}&type=requery`)

    return data?.data?.transactions?.[0] as Transaction
  }, [id])

  const getReceipt = useCallback(async () => {
    let data = await api.get(`${PATHS.TRANSACTION_DETAIL}?txHash=${id}&type=requery`)

    if (data?.data?.transactions?.[0]) {
      const transaction = data?.data?.transactions?.[0] as Transaction
      const txId = transaction.txId
      data = await api.get(`${PATHS.RECEIPT_DETAIL}?txId=${txId}`)
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
  }, [id])

  useEffect(() => {
    if (!id) return
    async function fetchData() {
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
  }, [id, showReceipt])

  return {
    transactionData,
    receiptData,
    showReceipt,
    setShowReceipt,
  }
}
