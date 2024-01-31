import React from 'react'

import { ContentLayout, StackedLineStockChart } from '../components'

import styles from './TransactionLineChart.module.scss'
import { useStats } from '../api'
import { convertTransactionStatsToSeriesData } from '../utils/transformChartData'

export const TransactionLineChart: React.FC = () => {
  const height = 600

  const { transactionStats, loading } = useStats({
    transactionStatsCount: 10000000,
  })

  return (
    <div className={styles.TransactionLineChart}>
      <ContentLayout title="Transactions per Cycle Chart">
        {loading ? (
          <div>Loading...</div>
        ) : (
          <StackedLineStockChart
            title="Transactions per Cycle Chart"
            centerTitle
            subTitle="Click and drag in the plot area to zoom in"
            height={height}
            data={convertTransactionStatsToSeriesData(transactionStats)}
            name="Transactions"
            groupData
          />
        )}
      </ContentLayout>
    </div>
  )
}
