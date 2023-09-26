import { useCallback, useEffect, useState } from 'react'
import { api, PATHS } from '../../api'
import { Account, AccountSearchType, Transaction, TransactionSearchType } from '../../../types'

interface detailProps {
  id: string
  txType?: TransactionSearchType
}

type AccountDetailHookResult = {
  account?: Account
  transactions?: Transaction
  total?: number
  page: number
  setPage: React.Dispatch<React.SetStateAction<number>>
}

export const useAccountDetailHook = ({ id, txType }: detailProps): AccountDetailHookResult => {
  const [account, setAccount] = useState<Account>()
  const [transactions, setTransactions] = useState<Transaction>()
  const [total, setTotal] = useState<number>()

  const [page, setPage] = useState<number>(1)
  const accountType = id && id.length === 64 ? AccountSearchType.NodeAccount : AccountSearchType.All
  const tType = txType || TransactionSearchType.All

  const getAddress = useCallback(async () => {
    const data = await api.get(`${PATHS.ACCOUNT}?address=${id}&accountType=${accountType}`)

    return data?.data?.accounts as Account[]
  }, [accountType, id])

  const getTransaction = useCallback(async () => {
    const data = await api.get(`${PATHS.TRANSACTION}?address=${id}&page=${page}&txType=${tType}`)

    return {
      transactions: data?.data?.transactions as Transaction[],
      total: data?.data?.totalTransactions,
    }
  }, [id, page, tType])

  const getToken = useCallback(async () => {
    await api.get(`${PATHS.ACCOUNT}?address=${id}&type=tokens`)
  }, [id])

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const accounts = await getAddress()

      if (
        (accounts && accounts.length > 0 && accounts[0].ethAddress) ||
        (accounts && accounts.length > 0 && accounts[0].accountId)
      ) {
        const { total, transactions } = await getTransaction()
        await getToken()

        setTransactions(transactions as unknown as Transaction)
        setTotal(total)
        setAccount(accounts[0])
      }
    }

    fetchData()
  }, [getAddress, getToken, getTransaction])

  // from contracts
  // from accounts

  return {
    account,
    transactions,
    total,
    page,
    setPage,
  }
}
