import useSWR from 'swr'
import { api } from './axios'

import { fetcher } from './fetcher'

import { PATHS } from './paths'

export const useStats = (query: any) => {
  const { validatorStatsCount, transactionStatsCount, fetchCoinStats } = query

  // console.log(fetcher, `${PATHS.STATS_VALIDATOR}?count=${count}&responseType=array`);
  let loading = true

  let response
  let validatorStats: any[] = []
  let transactionStats: any[] = []
  let totalSHM: number = 0
  let totalStakedSHM: number = 0

  if (validatorStatsCount) {
    response = useSWR(`${PATHS.STATS_VALIDATOR}?count=${validatorStatsCount}&responseType=array`, fetcher)
    // console.log("data", data);

    validatorStats = response?.data?.validatorStats || []
  }

  if (transactionStatsCount) {
    response = useSWR(`${PATHS.STATS_TRANSACTION}?count=${transactionStatsCount}&responseType=array`, fetcher)

    transactionStats = response?.data?.transactionStats || []
  }

  if (fetchCoinStats) {
    const response = useSWR(`${PATHS.STATS_COIN}`, fetcher)
    totalSHM = response?.data?.totalSupply || {}
    totalStakedSHM = response?.data?.totalStaked || {}
    console.log('data', response)
  }

  return {
    validatorStats,
    transactionStats,
    totalSHM,
    totalStakedSHM,
    loading: !loading,
  }
}
