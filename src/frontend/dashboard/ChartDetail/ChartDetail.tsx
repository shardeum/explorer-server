import React, { useState } from 'react'

import { Spacer, StackedLineChart } from '../../components'

import styles from './ChartDetail.module.scss'
import { TransactionStats } from '../../../stats/transactionStats'
import {
  convertTransactionStatsToSeriesData,
  convertValidatorStatsToSeriesData,
} from '../../utils/transformChartData'
import { ValidatorStats } from '../../../stats/validatorStats'
import { debounce } from '../../utils/debounce'
import { useRouter } from 'next/router'

export interface ChartDetailProps {
  validatorStats: ValidatorStats[]
  transactionStats: TransactionStats[]
}

export interface CycleLineMarker {
  cycle: number
  color: string
}

export const ChartDetail: React.FC<ChartDetailProps> = (data) => {
  const router = useRouter()
  const isDeveloperMode = router.query.mode === 'developer'
  const [markers, setMarkers] = useState<CycleLineMarker[]>([
    { cycle: 0, color: '#E61414' },
    { cycle: 0, color: '#24CC24' },
    { cycle: 0, color: '#3636E2' },
    { cycle: 0, color: '#F5C20A' },
  ])

  const debounceUpdateColor = debounce((color: string, index: number) => {
    setMarkers((prev) => {
      const newMarkers = [...prev]
      // eslint-disable-next-line security/detect-object-injection
      newMarkers[index] = { ...newMarkers[index], color }
      return newMarkers
    })
  }, 500)

  const handleCycleChange = (cycle: string, index: number): void => {
    setMarkers((prev) => {
      const newMarkers = [...prev]
      // eslint-disable-next-line security/detect-object-injection
      newMarkers[index] = { ...newMarkers[index], cycle: Number(cycle) }
      return newMarkers
    })
  }

  const handleColorChange = (color: string, index: number): void => {
    debounceUpdateColor(color, index)
  }

  const renderSelectionBoxes = (): JSX.Element[] => {
    return markers.map((marker, index) => (
      <div key={index} className={styles.item}>
        <input
          type="number"
          style={{ width: '75px' }}
          value={marker.cycle || ''}
          onChange={(e) => handleCycleChange(e.target.value, index)}
          placeholder={`Marker ${index + 1}`}
        />
        <div className={styles.customColorPicker}>
          <input
            type="color"
            value={marker.color}
            onChange={(e) => handleColorChange(e.target.value, index)}
          />
        </div>
      </div>
    ))
  }

  return (
    <>
      <div className={styles.CardDetail}>
        <div className={styles.header}>User Cycle Markers </div>
        <hr />
        <div className={styles.content}>{renderSelectionBoxes()}</div>
      </div>
      <Spacer space="4" />
      <div className={styles.ChartDetail}>
        <div className={styles.item}>
          <StackedLineChart
            title="ACTIVE VALIDATORS HISTORY IN LAST 1000 CYCLES"
            data={convertValidatorStatsToSeriesData(data.validatorStats)}
            name="Validators"
            cycleMarkers={markers}
          />
        </div>
        <div className={styles.item}>
          <StackedLineChart
            title="TOTAL TRANSACTION HISTORY IN LAST 1000 CYCLES"
            data={convertTransactionStatsToSeriesData(data.transactionStats, isDeveloperMode)}
            name="Transactions"
            cycleMarkers={markers}
          />
        </div>
      </div>
    </>
  )
}
