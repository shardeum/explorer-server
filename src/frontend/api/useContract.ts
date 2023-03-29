import useSWR from 'swr'
import { Account, ContractQuery, ContractType } from '../types'

import { fetcher } from './fetcher'

import { PATHS } from './paths'

export const useContract = (query: ContractQuery) => {
  const { page = 1, type } = query

  const { data } = useSWR(`${PATHS.ACCOUNT}?page=${page}&type=${type}`, fetcher)

  const contracts: Account[] = data?.accounts || []

  return {
    data: contracts,
    totalPages: data?.totalPages,
    total: data?.totalAccounts,
    loading: !data,
  }
}
