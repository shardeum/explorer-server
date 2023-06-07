import useSWR from 'swr'
import { ContractQuery } from '../types'
import { Account } from '../../types'

import { fetcher } from './fetcher'

import { PATHS } from './paths'
import { PagedAccountData } from '../types/account'

type ContractResult = {
  data: Account[]
  totalPages: number
  total: number
  loading: boolean
}

export const useContract = (query: ContractQuery): ContractResult => {
  const { page = 1, type } = query

  const { data } = useSWR<PagedAccountData>(`${PATHS.ACCOUNT}?page=${page}&type=${type}`, fetcher)

  return {
    data: data?.accounts || [],
    totalPages: data?.totalPages || 0,
    total: data?.totalAccounts || 0,
    loading: !data,
  }
}
