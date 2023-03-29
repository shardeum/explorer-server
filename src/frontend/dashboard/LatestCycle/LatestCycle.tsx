import moment from 'moment'
import { useRouter } from 'next/router'
import React from 'react'
import { AnchorLink, Button } from '../../components'
import { Cycle } from '../../types'

import styles from './LatestCycle.module.scss'

export interface LatestCycleProps {
  cycles: Cycle[]
}

export const LatestCycle: React.FC<LatestCycleProps> = ({ cycles }) => {
  const router = useRouter()
  return (
    <div className={styles.LatestCycle}>
      <div className={styles.title}>Latest Cycles</div>
      <hr />
      <div className={styles.content}>
        {cycles.map((item) => (
          <div key={item.counter} className={styles.item}>
            <div className={styles.logo}>C</div>
            <div>
              <AnchorLink
                href={`/cycle/${item.cycleRecord?.counter}`}
                label={item?.cycleRecord?.counter}
                size="small"
                ellipsis
              />
              <span>{moment(item?.cycleRecord?.start * 1000).calendar()}</span>
            </div>
            <div>
              <AnchorLink
                href={`/cycle/${item?.cycleRecord?.marker}`}
                label={item.cycleRecord?.marker}
                size="small"
                ellipsis
                width={100}
              />
              <span>CycleMarker</span>
            </div>
          </div>
        ))}
      </div>
      <hr />
      <Button
        className={styles.button}
        apperance="outlined"
        size="medium"
        onClick={() => {
          router.push('/cycle')
        }}
      >
        View all cycles
      </Button>
    </div>
  )
}
