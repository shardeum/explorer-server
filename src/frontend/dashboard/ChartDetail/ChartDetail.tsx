import React from 'react'

import { LineChart, StackedLineChart } from '../../components'

import styles from './ChartDetail.module.scss'
import { TransactionStats } from '../../../stats/transactionStats'
import {
  convertTransactionStatsToSeriesData,
  convertValidatorStatsToSeriesData,
} from '../../utils/transformChartData'
import { ValidatorStats } from '../../../stats/validatorStats'
import { useRouter } from 'next/router'

export interface ChartDetailProps {
  validatorStats: ValidatorStats[]
  transactionStats: TransactionStats[]
}

export const ChartDetail: React.FC<ChartDetailProps> = (data) => {
  const router = useRouter()
  const isDeveloperMode = router.query.mode === 'developer'
  return (
    <div className={styles.ChartDetail}>
      <div className={styles.item}>
        <StackedLineChart
          title="ACTIVE VALIDATORS HISTORY IN LAST 1000 CYCLES"
          data={convertValidatorStatsToSeriesData(data.validatorStats)}
          name="Validators"
        />
      </div>
      <div className={styles.item}>
        <StackedLineChart
          title="TOTAL TRANSACTION HISTORY IN LAST 1000 CYCLES"
          data={convertTransactionStatsToSeriesData(data.transactionStats, isDeveloperMode)}
          name="Transactions"
        />
      </div>
    </div>
  )
}
