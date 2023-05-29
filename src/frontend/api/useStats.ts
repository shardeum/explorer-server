import useSWR from 'swr'

import { fetcher } from './fetcher'

import { PATHS } from './paths'
import { ValidatorStats } from '../../stats/validatorStats'
import { TransactionStats } from '../../stats/transactionStats'

type StatsResult = {
  validatorStats: ValidatorStats[]
  transactionStats: TransactionStats[]
  totalSHM: number
  totalStakedSHM: number
  loading: boolean
}

export const useStats = (query: {
  validatorStatsCount?: number
  transactionStatsCount?: number
  fetchCoinStats?: boolean
}): StatsResult => {
  const { validatorStatsCount, transactionStatsCount, fetchCoinStats } = query

  // set query paths to `null` if we shouldn't fetch them
  const validatorStatsQuery = validatorStatsCount
    ? `${PATHS.STATS_VALIDATOR}?count=${validatorStatsCount}&responseType=array`
    : null
  const transactionStatsQuery = transactionStatsCount
    ? `${PATHS.STATS_TRANSACTION}?count=${transactionStatsCount}&responseType=array`
    : null
  const coinStatsQuery = fetchCoinStats ? `${PATHS.STATS_COIN}` : null

  // get responses
  const validatorStatsResponse = useSWR<{ validatorStats: ValidatorStats[] }>(validatorStatsQuery, fetcher)
  const transactionStatsResponse = useSWR<{ transactionStats: TransactionStats[] }>(
    transactionStatsQuery,
    fetcher
  )
  const coinStatsResponse = useSWR<{ totalSupply: number; totalStaked: number }>(coinStatsQuery, fetcher)

  // get values
  const validatorStats = validatorStatsResponse?.data?.validatorStats || []
  const transactionStats = transactionStatsResponse?.data?.transactionStats || []
  const totalSHM = coinStatsResponse?.data?.totalSupply || 0
  const totalStakedSHM = coinStatsResponse?.data?.totalStaked || 0

  return {
    validatorStats,
    transactionStats,
    totalSHM,
    totalStakedSHM,
    loading:
      validatorStatsResponse?.isValidating ||
      transactionStatsResponse?.isValidating ||
      coinStatsResponse?.isValidating,
  }
}
