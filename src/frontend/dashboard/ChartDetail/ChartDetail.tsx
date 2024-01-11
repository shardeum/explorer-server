import React from 'react'

import { LineChart, StackedLineChart } from '../../components'

import styles from './ChartDetail.module.scss'
import { TransactionStats } from '../../../stats/transactionStats'
import { convertTransactionStatsToSeriesData } from '../../utils/transformChartData'

export interface ChartDetailProps {
  validatorStats: number[][]
  transactionStats: TransactionStats[]
}

export const ChartDetail: React.FC<ChartDetailProps> = (data) => {
  return (
    <div className={styles.ChartDetail}>
      <div className={styles.item}>
        <LineChart
          title="ACTIVE VALIDATORS HISTORY IN LAST 1000 CYCLES"
          data={data.validatorStats}
          name="Validators"
        />
      </div>
      <div className={styles.item}>
        <StackedLineChart
          title="TOTAL TRANSACTION HISTORY IN LAST 1000 CYCLES"
          data={convertTransactionStatsToSeriesData(data.transactionStats)}
          name="Transactions"
        />
      </div>
    </div>
  )
}
