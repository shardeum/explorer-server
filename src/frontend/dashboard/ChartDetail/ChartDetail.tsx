import React from 'react'

import { LineChart } from '../../components'

import styles from './ChartDetail.module.scss'

export interface ChartDetailProps {
  validatorStats: number[][]
  transactionStats: number[][]
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
        <LineChart
          title="TOTAL TRANSACTION HISTORY IN LAST 1000 CYCLES"
          data={data.transactionStats}
          name="Transactions"
        />
      </div>
      {/* <div className={styles.item}>
        <BarChart title="CYCLES (This chart will be changed)" data={transactionData} />
      </div> */}
    </div>
  )
}
