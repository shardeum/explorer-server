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
  transactionResponseType?: string | undefined
  validatorResponseType?: string | undefined
}): StatsResult => {
  const {
    validatorStatsCount,
    transactionStatsCount,
    fetchCoinStats,
    transactionResponseType,
    validatorResponseType,
  } = query

  // set query paths to `null` if we shouldn't fetch them
  const validatorStatsQuery = validatorStatsCount
    ? `${PATHS.STATS_VALIDATOR}?count=${validatorStatsCount}&responseType=${validatorResponseType}`
    : null
  const transactionStatsQuery = transactionStatsCount
    ? `${PATHS.STATS_TRANSACTION}?count=${transactionStatsCount}&responseType=${transactionResponseType}`
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
  const validatorStats =
    typeof validatorStatsResponse.data === 'object' &&
    validatorStatsResponse.data != null &&
    'validatorStats' in validatorStatsResponse.data
      ? validatorStatsResponse.data.validatorStats
      : []
  const transactionStats =
    typeof transactionStatsResponse.data === 'object' &&
    transactionStatsResponse.data != null &&
    'transactionStats' in transactionStatsResponse.data
      ? transactionStatsResponse.data.transactionStats
      : []
  const totalSHM =
    typeof coinStatsResponse.data === 'object' &&
    coinStatsResponse.data != null &&
    'totalSupply' in coinStatsResponse.data
      ? Number(coinStatsResponse.data.totalSupply)
      : 0
  const totalStakedSHM =
    typeof coinStatsResponse.data === 'object' &&
    coinStatsResponse.data != null &&
    'totalStaked' in coinStatsResponse.data
      ? Number(coinStatsResponse.data.totalStaked)
      : 0

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
