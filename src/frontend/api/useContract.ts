import useSWR from 'swr'
import { Account, ContractQuery } from '../types'

import { fetcher } from './fetcher'

import { PATHS } from './paths'
import { PagedAccountData } from '../types/account'

type ContractResult = {
  data: Account[]
  totalPages?: number
  total?: number
  loading: boolean
}

export const useContract = (query: ContractQuery): ContractResult => {
  const { page = 1, type } = query

  const { data } = useSWR<PagedAccountData>(`${PATHS.ACCOUNT}?page=${page}&type=${type}`, fetcher)

  const contracts: Account[] = data?.accounts || []

  return {
    data: contracts,
    totalPages: data?.totalPages,
    total: data?.totalAccounts,
    loading: !data,
  }
}
