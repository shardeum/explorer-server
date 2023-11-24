import { useCallback, useEffect, useState } from 'react'
import { api, PATHS } from '../../api'
import { Account, AccountType, ContractType, Token, Transaction, TransactionSearchType } from '../../../types'
import { BigNumberish, utils } from 'ethers'

interface detailProps {
  id: string
  txType?: TransactionSearchType
}

export type AccountDetails = {
  account: Account | undefined
  accountType: AccountType
  transactions: Transaction[]
  totalPages: number
  totalTransactions: number
  tokens: Token[]
  page: number
  transactionType: TransactionSearchType
  setPage: (page: number) => void
  setTransactionType: (type: TransactionSearchType) => void
}

export const useAccountDetailHook = ({ id, txType }: detailProps): AccountDetails => {
  const [account, setAccount] = useState<Account>()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [totalPages, setTotalPages] = useState<number>(1)
  const [totalTransactions, setTotalTransactions] = useState<number>(0)
  const [tokens, setTokens] = useState<Token[]>([])
  const [page, setPage] = useState<number>(1)
  const [transactionType, setTransactionType] = useState<TransactionSearchType>(
    txType || TransactionSearchType.AllExceptInternalTx
  )

  const accountType = id && id.length === 64 ? AccountType.NodeAccount2 : AccountType.Account // TODO: I think it has to be EOA

  const getAddress = useCallback(async () => {
    const data = await api.get(`${PATHS.ACCOUNT}?address=${id}&accountType=${accountType}`)

    return data?.data?.accounts as Account[]
  }, [accountType, id])

  const getTransaction = useCallback(async () => {
    const data = await api.get(`${PATHS.TRANSACTION}?address=${id}&page=${page}&txType=${transactionType}`)

    return {
      transactions: data?.data?.transactions as Transaction[],
      totalTransactions: data?.data?.totalTransactions,
      totalPages: data?.data?.totalPages,
    }
  }, [id, page, transactionType])

  const getToken = useCallback(async () => {
    const data = await api.get(`${PATHS.TOKEN}?address=${id}`)

    return {
      tokens: data?.data?.tokens,
    }
  }, [id])

  useEffect(() => {
    setTransactions([])
    setAccount(undefined)

    async function fetchData(): Promise<void> {
      const accounts = await getAddress()

      if (
        (accounts && accounts.length > 0 && accounts[0].ethAddress) ||
        (accounts && accounts.length > 0 && accounts[0].accountId)
      ) {
        setAccount(accounts[0])
        const { totalTransactions, transactions } = await getTransaction()

        setTransactions(transactions as Transaction[])
        setTotalTransactions(totalTransactions)
        setTotalPages(totalPages)
      }

      if (accountType === AccountType.Account) {
        if (
          (accounts && accounts.length > 0 && accounts[0].ethAddress) ||
          (accounts && accounts.length > 0 && accounts[0].accountId)
        ) {
          const { tokens } = await getToken()
          if (tokens.length > 0) {
            tokens.forEach(
              (item: {
                contractType: ContractType
                contractInfo: { decimals: string }
                balance: BigNumberish
              }) => {
                if (item.contractType === ContractType.ERC_20) {
                  const decimalsValue = item.contractInfo.decimals ? parseInt(item.contractInfo.decimals) : 18
                  item.balance = utils.formatUnits(item.balance, decimalsValue)
                }
              }
            )
          }
          setTokens(tokens)
        }
      }
    }

    fetchData()
  }, [accountType, getToken, totalPages, id, getAddress, getTransaction])

  return {
    account,
    accountType,
    transactions,
    tokens,
    totalTransactions,
    totalPages,
    page,
    setPage,
    transactionType,
    setTransactionType,
  }
}
