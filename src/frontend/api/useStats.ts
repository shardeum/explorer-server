import useSWR, { SWRResponse } from 'swr'

import { fetcher } from './fetcher'

import { PATHS } from './paths'

export const useStats = (query: any) => {
  const { validatorStatsCount, transactionStatsCount, fetchCoinStats } = query

  // console.log(fetcher, `${PATHS.STATS_VALIDATOR}?count=${count}&responseType=array`);
  const loading = true

  let response: SWRResponse<any, any>
  let validatorStats: any[] = []
  let transactionStats: any[] = []
  let totalSHM = 0
  let totalStakedSHM = 0

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
    response = useSWR(`${PATHS.STATS_COIN}`, fetcher)
    totalSHM = response?.data?.totalSupply || 0
    totalStakedSHM = response?.data?.totalStaked || 0
  }

  return {
    validatorStats,
    transactionStats,
    totalSHM,
    totalStakedSHM,
    loading: !loading,
  }
}
