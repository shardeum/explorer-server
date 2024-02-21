import { TransactionStats } from '../../stats/transactionStats'
import { ValidatorStats } from '../../stats/validatorStats'

interface DataPoint {
  x: number
  y: number
  cycle: number
}

interface SeriesData {
  name: string
  data: DataPoint[]
  zIndex: number
  tooltip?: string
}

export function convertTransactionStatsToSeriesData(
  transactionStats: TransactionStats[],
  isDeveloperMode: boolean
): SeriesData[] {
  let seriesData: SeriesData[] = [
    { name: 'Total Txs', data: [], zIndex: 10, tooltip: 'Count of all transactions' },
    { name: 'Total Internal Txs', data: [], zIndex: 9, tooltip: 'Count of all internal transactions' },
    { name: 'Stake', data: [], zIndex: 8, tooltip: 'Count of all validator stake transactions' },
    { name: 'Unstake', data: [], zIndex: 7, tooltip: 'Count of all validator unstake transactions' },
    { name: 'Set Global Code Bytes', data: [], zIndex: 6 },
    { name: 'Init Network', data: [], zIndex: 5 },
    { name: 'Node Reward', data: [], zIndex: 4 },
    { name: 'Change Config', data: [], zIndex: 3 },
    { name: 'Apply Change Config', data: [], zIndex: 2 },
    { name: 'Set Cert Time', data: [], zIndex: 1 },
    { name: 'Init Reward Times', data: [], zIndex: 0 },
    { name: 'Claim Reward', data: [], zIndex: -1 },
    { name: 'Change Network Param', data: [], zIndex: -2 },
    { name: 'Apply Network Param', data: [], zIndex: -3 },
    { name: 'Penalty', data: [], zIndex: -4 },
  ]

  transactionStats.forEach((stat) => {
    const timestampMillis = stat.timestamp * 1000

    seriesData[0].data.push({ x: timestampMillis, y: stat.totalTxs, cycle: stat.cycle })
    seriesData[1].data.push({ x: timestampMillis, y: stat.totalInternalTxs, cycle: stat.cycle })
    seriesData[2].data.push({ x: timestampMillis, y: stat.totalStakeTxs, cycle: stat.cycle })
    seriesData[3].data.push({ x: timestampMillis, y: stat.totalUnstakeTxs, cycle: stat.cycle })
    seriesData[4].data.push({ x: timestampMillis, y: stat.totalSetGlobalCodeBytesTxs, cycle: stat.cycle })
    seriesData[5].data.push({ x: timestampMillis, y: stat.totalInitNetworkTxs, cycle: stat.cycle })
    seriesData[6].data.push({ x: timestampMillis, y: stat.totalNodeRewardTxs, cycle: stat.cycle })
    seriesData[7].data.push({ x: timestampMillis, y: stat.totalChangeConfigTxs, cycle: stat.cycle })
    seriesData[8].data.push({ x: timestampMillis, y: stat.totalApplyChangeConfigTxs, cycle: stat.cycle })
    seriesData[9].data.push({ x: timestampMillis, y: stat.totalSetCertTimeTxs, cycle: stat.cycle })
    seriesData[10].data.push({ x: timestampMillis, y: stat.totalInitRewardTimesTxs, cycle: stat.cycle })
    seriesData[11].data.push({ x: timestampMillis, y: stat.totalClaimRewardTxs, cycle: stat.cycle })
    seriesData[12].data.push({ x: timestampMillis, y: stat.totalChangeNetworkParamTxs, cycle: stat.cycle })
    seriesData[13].data.push({ x: timestampMillis, y: stat.totalApplyNetworkParamTxs, cycle: stat.cycle })
    seriesData[14].data.push({ x: timestampMillis, y: stat.totalPenaltyTxs, cycle: stat.cycle })
  })

  if (!isDeveloperMode) {
    seriesData = seriesData.filter((series) =>
      ['Total Txs', 'Unstake', 'Stake', 'Total Internal'].includes(series.name)
    )
  }

  return seriesData
}

export function convertValidatorStatsToSeriesData(validatorStats: ValidatorStats[]): SeriesData[] {
  const seriesData: SeriesData[] = [
    { name: 'Active', data: [], zIndex: 5, tooltip: 'Count of all currently active validators' },
    {
      name: 'Activated',
      data: [],
      zIndex: 4,
      tooltip: 'Count of all validators that have been activated in a cycle',
    },
    { name: 'Syncing', data: [], zIndex: 3, tooltip: 'Count of all validators that are currently syncing' },
    {
      name: 'Removed',
      data: [],
      zIndex: 2,
      tooltip: 'Count of all validators that have been removed in a cycle',
    },
    {
      name: 'Apoped',
      data: [],
      zIndex: 1,
      tooltip: 'Count of all validators that have been apoped in a cycle',
    },
  ]

  validatorStats.forEach((stat) => {
    const timestampMillis = stat.timestamp * 1000

    seriesData[0].data.push({ x: timestampMillis, y: stat.active, cycle: stat.cycle })
    seriesData[1].data.push({ x: timestampMillis, y: stat.activated, cycle: stat.cycle })
    seriesData[2].data.push({ x: timestampMillis, y: stat.syncing, cycle: stat.cycle })
    seriesData[3].data.push({ x: timestampMillis, y: stat.removed, cycle: stat.cycle })
    seriesData[4].data.push({ x: timestampMillis, y: stat.apoped, cycle: stat.cycle })
  })

  return seriesData
}
