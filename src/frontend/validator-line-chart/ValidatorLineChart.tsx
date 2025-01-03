import React, { useState } from 'react'

import { ContentLayout, StackedLineStockChart } from '../components'

import styles from './ValidatorLineChart.module.scss'
import { useStats } from '../api'
import { convertValidatorStatsToSeriesData } from '../utils/transformChartData'

export const ValidatorLineChart: React.FC = () => {
  const [refreshEnabled, setRefreshDisabled] = useState(true)
  const height = 600

  const { validatorStats, loading } = useStats({
    validatorStatsCount: 10000000,
    refreshEnabled,
  })

  const toggleNoRefresh = (): void => setRefreshDisabled((prev) => !prev)

  return (
    <div className={styles.ValidatorLineChart}>
      <ContentLayout title="Active Validators per Cycle Chart">
        <div style={{ marginBottom: '1rem' }}>
          <label>
            <input
              type="checkbox"
              checked={refreshEnabled}
              onChange={toggleNoRefresh}
              style={{ appearance: 'auto' }}
            />
            <span> Auto Refresh</span>
          </label>
        </div>

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
