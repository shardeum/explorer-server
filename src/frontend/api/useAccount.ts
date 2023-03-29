import useSWR from 'swr'
import { Account, AccountQuery } from '../types'

import { fetcher } from './fetcher'

import { PATHS } from './paths'

export const useAccount = (query: AccountQuery) => {
  const { page, count, type } = query

  const createUrl = () => {
    let url = `${PATHS.ACCOUNT}?page=${page}`

    if (count) url = `${PATHS.ACCOUNT}?count=${count}`
    if (type) {
      url += `&type=${type}`
    }
    return url
  }

  const { data } = useSWR(createUrl(), fetcher)
  const accounts: Account[] = data?.accounts || []

  const res = {
    accounts,
    totalPages: data?.totalPages || 0,
    totalAccounts: data?.totalAccounts || 0,
    totalContracts: data?.totalContracts || 0,
    loading: !data,
  }

  return res
}
