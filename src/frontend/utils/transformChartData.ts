import { TransactionStats } from '../../stats/transactionStats'

interface DataPoint {
  x: number
  y: number
  cycle: number
}

interface SeriesData {
  name: string
  data: DataPoint[]
  zIndex: number
}

export function convertTransactionStatsToSeriesData(transactionStats: TransactionStats[]): SeriesData[] {
  const seriesData: SeriesData[] = [
    { name: 'Total Txs', data: [], zIndex: 4 },
    { name: 'Total Internal Txs', data: [], zIndex: 3 },
    { name: 'Total Stake Txs', data: [], zIndex: 2 },
    { name: 'Total Unstake Txs', data: [], zIndex: 1 },
  ]

  transactionStats.forEach((stat) => {
    const timestampMillis = stat.timestamp * 1000

    seriesData[0].data.push({ x: timestampMillis, y: stat.totalTxs, cycle: stat.cycle })
    seriesData[1].data.push({ x: timestampMillis, y: stat.totalInternalTxs, cycle: stat.cycle })
    seriesData[2].data.push({ x: timestampMillis, y: stat.totalStakeTxs, cycle: stat.cycle })
    seriesData[3].data.push({ x: timestampMillis, y: stat.totalUnstakeTxs, cycle: stat.cycle })
  })

  return seriesData
}