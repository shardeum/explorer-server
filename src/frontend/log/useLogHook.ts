import { ChangeEvent, useCallback, useEffect, useState } from 'react'
import { api, PATHS } from '../api'
import { Transaction } from '../types'

export const useLogHook = (addr?: string, tps?: string) => {
  const [address, setAddress] = useState<string>('')
  const [topic, setTopic] = useState<string>('')
  const [page, setPage] = useState<number>(1)
  const [transactions, setTransaction] = useState<Transaction[]>([])
  const [total, setTotal] = useState<number>(0)

  useEffect(() => {
    if (addr) setAddress(addr)
    if (tps) setTopic(tps)

    if (addr || tps) {
      getTransaction(addr || '', tps || '')
    }
  }, [addr, tps, getTransaction])

  const onAddressChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setAddress(e.target.value)
  }, [])

  const onTopicChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setTopic(e.target.value)
  }, [])

  const createURL = useCallback(
    (address: string, topic: string) => {
      let topic0: string | any[] | null = null
      let topic1: string | any[] | null = null
      let topic2: string | any[] | null = null
      let topic3: string | any[] | null = null

      if (topic) {
        const topicItems = topic.split(',')

        topic0 = topicItems[0]
        topic1 = topicItems[1]
        topic2 = topicItems[2]
        topic3 = topicItems[3]
      }

      let url = `${PATHS.LOG}?`

      if (address && address?.length === 42) url += `address=${address}`

      if (topic0 && topic0?.length === 66) {
        if (address && address.length === 42) url += `&topic0=${topic0}`
        else url += `topic0=${topic0}`
      }

      if (topic1 && topic1.length === 66) url += `&topic1=${topic1}`

      if (topic2 && topic2.length === 66) url += `&topic2=${topic2}`

      if (topic3 && topic3.length === 66) url += `&topic3=${topic3}`

      url += `&page=${page}&type=txs`

      return url
    },
    [page]
  )

  const getTransaction = useCallback(
    async (address: string, topic: string) => {
      const data = await api.get(createURL(address, topic))

      const transactions: Transaction[] = data?.data?.transactions

      if (transactions && transactions.length > 0) {
        setTransaction(transactions)
        setTotal(data?.data?.totalTransactions)
      } else {
        setTransaction([])
        setTotal(0)
      }
    },
    [createURL]
  )

  const onSearch = useCallback(async () => {
    getTransaction(address, topic)
  }, [address, topic, getTransaction])

  return {
    address,
    onAddressChange,
    topic,
    onTopicChange,
    onSearch,
    transactions,
    page,
    setPage,
    total,
  }
}
