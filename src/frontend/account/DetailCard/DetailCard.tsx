import React, { ReactNode } from 'react'
import cx from 'classnames'

import styles from './DetailCard.module.scss'

interface Item {
  key: string | number
  value: string | ReactNode
}

interface DetailCardProps {
  title: string
  titleRight?: ReactNode
  items: Item[]
}

export const DetailCard: React.FC<DetailCardProps> = (props) => {
  const { title, titleRight, items } = props

  return (
    <div className={styles.DetailCard}>
      <div className={styles.header}>
        <div>{title}</div>
        {titleRight && titleRight}
      </div>
      {items.map((item, index) => (
        <div
          className={cx(styles.row, items.length === index + 1 && styles.last)}
          key={`${index}-${item.key}`}
        >
          <div className={styles.title}>{item.key}</div>
          <div className={styles.value}>{item.value}</div>
        </div>
      ))}
    </div>
  )
}
