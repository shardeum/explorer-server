import React from 'react'

import { ContentLayout, StackedLineStockChart } from '../components'

import styles from './ValidatorLineChart.module.scss'
import { useStats } from '../api'
import { convertValidatorStatsToSeriesData } from '../utils/transformChartData'

export const ValidatorLineChart: React.FC = () => {
  const height = 600

  const { validatorStats, loading } = useStats({
    validatorStatsCount: 10000000,
  })

  return (
    <div className={styles.ValidatorLineChart}>
      <ContentLayout title="Active Validators per Cycle Chart">
        {loading ? (
          <div>Loading...</div>
        ) : (
          <StackedLineStockChart
            title="Active Validators per Cycle Chart"
            centerTitle
            subTitle="Click and drag in the plot area to zoom in"
            height={height}
            data={convertValidatorStatsToSeriesData(validatorStats)}
            name="Validators"
            groupData={false}
          />
        )}
      </ContentLayout>
    </div>
  )
}
