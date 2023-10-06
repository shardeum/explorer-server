import { ChangeEvent, useCallback, useEffect, useState } from 'react'
import { api, PATHS } from '../api'
import {
  Account,
  AccountSearchType,
  Transaction,
  TransactionSearchType,
  Token,
  TransactionType,
  TokenTx,
} from '../../types'
import { set } from 'lodash'

interface detailProps {
  id: string
  address?: string
}

type TokenHookResult = {
  account?: Account
  transactions: TokenTx[]
  tokens: Token[]
  totalTokenHolders: number
  total: number
  page: number
  transactionType: TransactionSearchType
  tokenHolderPage: number
  filteredAddress: string
  activeTab: number | string
  tokenBalance: string
  setPage: (page: number) => void
  setTransactionType: (transactionType: TransactionSearchType) => void
  setTokenHolderPage: (page: number) => void
  onAddressChange: (e: ChangeEvent<HTMLInputElement>) => void
  onTabChange: (e: TransactionSearchType) => void
}

export const useTokenHook = ({ id, address }: detailProps): TokenHookResult => {
  const [account, setAccount] = useState<Account>()
  const [transactions, setTransactions] = useState<TokenTx[]>([])
  const [tokens, setTokens] = useState<Token[]>([])
  const [totalTokenHolders, setTokenHolders] = useState<number>(0)
  const [total, setTotal] = useState<number>(0)
  const [page, setPage] = useState<number>(1)
  const [transactionType, setTransactionType] = useState<number>(TransactionSearchType.AllExceptInternalTx)
  const [tokenHolderPage, setTokenHolderPage] = useState<number>(1)
  const [filteredAddress, setFilteredAddress] = useState<string>('')
  const [activeTab, setActiveTab] = useState(TransactionSearchType.AllExceptInternalTx)
  const [tokenBalance, setTokenBalance] = useState<string>('')

  const accountType = id && id.length === 64 ? AccountSearchType.NodeAccount : AccountSearchType.All // TODO: I think it has to be EOA

  const onAddressChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setFilteredAddress(e.target.value)
  }, [])

  const onTabChange = useCallback((tab: TransactionSearchType) => {
    setActiveTab(tab)
  }, [])

  const getAddress = useCallback(async () => {
    if (id.length !== 42 && id.length !== 64) return
    const data = await api.get(`${PATHS.ACCOUNT}?address=${id}&accountType=${accountType}`)
    return data?.data?.accounts as Account[]
  }, [accountType, id])

  const getTransaction = useCallback(async () => {
    if (filteredAddress.length !== 42 && filteredAddress.length !== 0) {
      return {
        transactions,
        total,
        tokenBalance,
      }
    }
    let url = `${PATHS.TRANSACTION}?address=${id}&page=${page}&txType=${TransactionSearchType.TokenTransfer}`

    if (filteredAddress) {
      url += `&filterAddress=${filteredAddress}`
    }

    const data = await api.get(url)

    return {
      transactions: data?.data?.transactions as TokenTx[],
      total: data?.data?.totalTransactions,
      tokenBalance: data?.data?.filterAddressTokenBalance,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredAddress, id, page, transactionType])

  const getToken = useCallback(async () => {
    if (id.length !== 42 && id.length !== 64)
      return {
        totalTokenHolders,
        tokens,
      }
    const data = await api.get(`${PATHS.TOKEN}?contractAddress=${id}&page=${tokenHolderPage}`)

    return {
      totalTokenHolders: data?.data?.totalTokenHolders,
      tokens: data?.data?.tokens,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, tokenHolderPage])

  useEffect(() => {
    async function fetchData(): Promise<void> {
      const accounts = await getAddress()

      if (
        (accounts && accounts.length > 0 && accounts[0].ethAddress) ||
        (accounts && accounts.length > 0 && accounts[0].accountId)
      ) {
        // make sure the account is a contract
        if (accounts[0].contractType === null) return
        const { total, transactions, tokenBalance } = await getTransaction()

        setTransactions(transactions)
        if (transactions.length > 0) {
          const tokenType =
            transactions[0].tokenType === TransactionType.ERC_20
              ? TransactionSearchType.ERC_20
              : transactions[0].tokenType === TransactionType.ERC_721
              ? TransactionSearchType.ERC_721
              : transactions[0].tokenType === TransactionType.ERC_1155
              ? TransactionSearchType.ERC_1155
              : TransactionSearchType.AllExceptInternalTx
          setTransactionType(tokenType)
        }
        setTotal(total)
        setAccount(accounts[0])
        setTokenBalance(tokenBalance)
      }

      if (
        (accounts && accounts.length > 0 && accounts[0].ethAddress) ||
        (accounts && accounts.length > 0 && accounts[0].accountId)
      ) {
        const { totalTokenHolders, tokens } = await getToken()
        setTokenHolders(totalTokenHolders)
        setTokens(tokens)
      }
    }

    fetchData()
  }, [getAddress, getTransaction, getToken])

  useEffect(() => {
    if (address) {
      setFilteredAddress(address)
    }
  }, [address])

  return {
    account,
    transactions,
    totalTokenHolders,
    tokens,
    total,
    page,
    setPage,
    tokenHolderPage,
    setTokenHolderPage,
    transactionType,
    setTransactionType,
    filteredAddress,
    onAddressChange,
    activeTab,
    onTabChange,
    tokenBalance,
  }
}
